const periodMinutes = 2;
const DEBUG = false;

/*
Redirect HTTP request for liquipedia stream with query redirect=true
to the appropriate twitch stream
*/
async function redirect(requestDetails)
{
    // Fetch the html content of the liquipedia stream
    let value = await fetch(requestDetails.url.split("?")[0]);
    let text = await value.text();
    let parser = new DOMParser();
    let doc = parser.parseFromString(text, "text/html");
    // Extract the stream source
    let twitchURL = doc.querySelector('#stream iframe').src.split("&")[0].split("?");
    // Return the URL of the twitch stream
    return {
        redirectUrl: "https://www.twitch.tv/" + twitchURL[1].split("=")[1] //TODO replace with regex
    };
}

/*
Send the user a notification saying how many games are live
*/
function notify(count)
{
    browser.notifications.create({
        type: "basic",
        iconUrl: runtime.getURL("icons/active-48.png"),
        title: "Live matches!",
        message: `There ${count > 1?"are":"is"} ${count} live match${count > 1?"es":""}. Click the taskbar to check ${count > 1?"them":"it"} out.\n\nYou can turn off notifications in the settings.`,
    });
}

/*
Replace the taskbar icon to active if there are ongoing games
or inactive if not
*/
function updateIcon(active)
{
    browser.browserAction.setIcon({
        path: active ? {
            
            38: DEBUG ? "/icons/debug-active-38.png" : "/icons/active-38.png"
        } : {
            
            38: DEBUG ? "/icons/debug-inactive-38.png" : "/icons/inactive-38.png"
        }
    });
}

/*
Count the number of matches that have already started
*/
function countOngoingMatches(matches)
{
    currentTime = new Date().getTime().toString().slice(0,10); // Remove ms 

    return matches.reduce((accumulator, match) => {
        let matchTime = match.date;
        return accumulator + (currentTime>matchTime);
    }, 0);
}

/*
Generate the liquipedia match request
*/
function generateRequest(requestDetails)
{
    // Filter out matches from an earlier date TODO does this go wrong? e.g. clocks change
    let threshold_date = new Date();
    threshold_date.setHours(threshold_date.getHours() - 12); //Buffer of 12 hours before now to remove games that weren't marked finished
    
    /*
    Join and encode the request conditions
    */
    function encode(to_encode)
    {
        // Japanese locale string has format YYY-MM-DD hh:mm:ss
        return encodeURIComponent(to_encode.join("|").replace(/\$threshold_date/g, threshold_date.toLocaleString("ja-JP")));
    }
    let request = `${requestDetails.url}`+
        `&conditions=${encode(requestDetails.conditions)}`+
        `&printouts=${encode(requestDetails.printOut)}`+
        `&parameters=${encode(requestDetails.parameters)}`+
        `&api_version=${requestDetails.api_version}`

    if (DEBUG) console.log(request);

    return request;
}

/*
Parse a match into a more easily usable object
*/
function parseMatch(match)
{
    let teamLeft = match.printouts["has team left"][0].fulltext;
    let teamRight = match.printouts["has team right"][0].fulltext;
    let youtube = match.printouts["Has match youtube"];
    let twitch = match.printouts["Has match twitch"];
    let tier = (match.printouts["Has tournament tier"][0])?match.printouts["Has tournament tier"][0]:4

    return {
        "team": match.printouts["Has teams"],
        "tier": tier,
        "valve": match.printouts["is valve premier"][0] === "t",  // Convert to bool 
        "teamLeft": (teamLeft === "Glossary")?"TBD":teamLeft,  // Replace default with TBD
        "teamRight": (teamRight === "Glossary")?"TBD":teamRight,  // Replace default with TBD
        "scoreLeft": match.printouts["Has team left score"][0],
        "scoreRight": match.printouts["Has team right score"][0],
        "date": match.printouts["has map_date"][0].timestamp,  // Get time as UTC
        "youtube": (youtube.length > 0)?youtube[0].split("/")[1]:"", // Remove channel name
        "twitch": (twitch.length > 0)?twitch[0]:"", // Convert to lower case
        "tournament": match.printouts["has tournament"][0].fulltext
    }
}

function compareDate(a, b)
{
    return a.date - b.date
}

/*
Get matches from liquipedia, filter them and store them for popup 
*/
function getMatches(filters)
{
    // Open and read the LiquipediaRequest file
    fetch("LiquipediaRequest.json")  
        .then((response) => 
            response.json())
        // Generate and send the Liquipedia api request to get the matches
        .then((requestDetails) => 
            fetch(generateRequest(requestDetails)))
        // Convert api resoponse to json
        .then((matchesResponse) => 
            matchesResponse.json())
        .then((matchesJSON) =>
        {
            if (DEBUG) console.log(matchesJSON.query.results);
            // Parse results into an easier to use object, sort and filter 
            let matchesParsed = Object.values(matchesJSON.query.results).map(parseMatch);
            if (DEBUG) console.log(matchesParsed)
            // Filter results and sort by date ascending
            let matches = matchesParsed.filter((match) =>
            {   
                // false if the match is not a valve tournament and "only valve tournaments" is selected
                let valveValid = (!(!match.valve && filters.tiers.valve));
                // true if liquipedia tier of the match is selected in settings
                let tierValid = (filters.tiers[`tier${match.tier}`])

                return (valveValid && tierValid);
            }).sort(compareDate);
            // Save matches for popup
            browser.storage.local.set({matches});
            //--------------------------------------
            if (DEBUG) console.log(matches)  // Debug
            //--------------------------------------
            // Get the current number of ongoing matches
            let count = countOngoingMatches(matches);
            // Update the hotbar icon to show if there are ongoing matches
            updateIcon((count > 0));
            // Get the previous number of ongoing matches
            browser.storage.local.get("ongoingMatches").then((item) => 
            {
                let prevOngoingMatches = item.ongoingMatches;
                // If there are more than previous, send a notification. (Doesn't account for new match starting at same time as other finishing)
                if (prevOngoingMatches < count)
                {
                    browser.storage.local.get("matches").then((result) => 
                    {
                        if (result.notifications) {
                            notify(count);
                        }
                    }, (error) => {console.log(error)});
                
                }
                // Store new ongoing game count
                browser.storage.local.set({count});
            }, (error) => {console.log(error)});        
        });
}

/*
Run every time the clock ticks, Get filters then 
*/
function handleAlarm(alarmInfo)
{
    if (alarmInfo.name === "periodicUpdate")
    {
        // Get filters from settings
        // Get matches, update icon and notify
        browser.storage.sync.get(["tiers", "players", "teams"]).then(getMatches,
            (error)=>{console.log(error)});
    }
}

/*
Start the extension
*/
function start(){
    let ongoingMatches = 0;  // Variable used for notifications
    browser.storage.local.set({ongoingMatches});
    // Start clock
    browser.alarms.create("periodicUpdate",{
        "when": Date.now(),
        "periodInMinutes": periodMinutes,
    });
}

/*
Run on installation of the extension
*/
function init()
{
    console.log("Initialising")
    // Initialise default settings options               
    browser.storage.sync.set({
        tiers:{
            "valve": false,
            "tier1": true,
            "tier2": true,
            "tier3": false,
            "tier4": false
        },
        notifications:false //TODO true
    });

    // Start running
    start();
}

// Set up listners
browser.alarms.onAlarm.addListener(handleAlarm);  // When clock ticks
browser.runtime.onInstalled.addListener(init);  // On extension installation
browser.runtime.onStartup.addListener(start);  // On browser startup
browser.runtime.onMessage.addListener(start);  // On receiving a message
browser.webRequest.onBeforeRequest.addListener(  // Web request interceptor for liquipedia twitch streams
    redirect,
    {urls:["https://liquipedia.net/dota2/Special:Stream/twitch/*?redirect=true"]},
    ["blocking"]
);