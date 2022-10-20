// TODO readup on js string formatting
const baseRequest = "https://liquipedia.net/dota2/api.php?action=askargs&format=json&conditions=";
const after = "has map_date::>";
const imageRequest = "https://liquipedia.net/dota2/api.php?action=askargs&format=json&conditions=%20%3A%2B%20%7CHas%20id%3A%3A";
const imageParameters = "&printouts=Has%20image&parameters=&api_version=2";

const printOut = encodeURIComponent("Has tournament type |Has teams |Has tournament tier |has map_date |has tournament |has team left |has team right |has match stream |has tournament icon |Has tournament name |Has team left score |Has team right score |Has match twitch |Has match afreeca |Has match afreecatv |Has match dailymotion |Has match douyu |Has match smashcast |Has match youtube |Has match huomao |Has match facebook |has player left |has player left page |has player left flag |has player left score |has player right |has player right page |has player right flag |has player right score |is individual tournament |Has game count |is valve premier");
const baseParameters = `&printouts=${printOut}%20&parameters=`;
const defaultFilters = "-Has subobject::+|:+|Has exact time::true|Is finished::false";
const sep = "%7C"  // creates "|"            
const periodMinutes = 2;

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
            19: "/icons/active-19.png",
            38: "/icons/active-38.png"
        } : {
            19: "/icons/inactive-19.png",
            38: "/icons/inactive-38.png"
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
Iterate over favourite teams.
Return true if any are playing in the match
*/
function checkTeams(teams, filterTeams)
{
    teams.forEach((team, index) => {
        filterTeams.forEach((filterTeam, fIndex) => {
            if (filterTeam === team[0].fulltext) {
                return true
            }
        });
    });
    return false
}

/*
Make HTTP request and convert result into JSON,
then apply function
*/
async function getJSON(request, func)
{
    let value = await fetch(request);
    value.json().then(func);
}

/*
Parse a match into a more easily usable object
*/
function parseMatch(match)
{
    let teamLeft = match.printouts["has team left "][0].fulltext;
    let teamRight = match.printouts["has team right "][0].fulltext;
    let youtube = match.printouts["Has match youtube "];
    let twitch = match.printouts["Has match twitch "];
    
    return {
        "team": match.printouts["Has teams "],
        "tier": match.printouts["Has tournament tier "][0].fulltext,
        "valve": match.printouts["is valve premier "][0] === "t",  // Convert to bool 
        "teamLeft": (teamLeft === "Glossary")?"TBD":teamLeft,  // Replace default with TBD
        "teamRight": (teamRight === "Glossary")?"TBD":teamRight,  // Replace default with TBD
        "scoreLeft": match.printouts["Has team left score "][0],
        "scoreRight": match.printouts["Has team right score "][0],
        "date": match.printouts["has map_date "][0].timestamp,  // Get time as UTC
        "youtube": (youtube.length > 0)?youtube[0].split("/")[1]:"", // Remove channel name
        "twitch": (twitch.length > 0)?twitch[0].toLowerCase():"", // Convert to lower case
        "tournament": match.printouts["has tournament "][0].fulltext
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
    // Create liquipedia API request
    let earlier = new Date();
    earlier.setHours(earlier.getHours() - 8); //Buffer of 8 hours before now to get long games TODO is this necesssary?
    let timeFilter = `|${after}${earlier.toLocaleString("ja-JP")}` // Japanese locale string has format YYY-MM-DD hh:mm:ss TODO does this go wrong? e.g. clocks change
    let filtersURL = encodeURIComponent(defaultFilters + timeFilter)
    let request = `${baseRequest}${filtersURL}${baseParameters}`;

    // Send request
    getJSON(request, (matchesJSON) =>
    {
        // Parse results into easier to use object sort and filter 
        let matchesParsed = Object.values(matchesJSON.query.results).map(parseMatch);
        // Filter results and sort by date ascending
        let matches = matchesParsed.filter((match)=>
        {   
            // If no favourite teams are selected return true.
            // Otherwise return true if the match contains a favourite team
            let teamValid = (filters.teams.length == 0 || checkTeams(match.teams, filters.teams));
            // Returns false if the match is not a valve tournament and only valve tournaments is selected
            let valveValid = (!(!match.valve && filters.tiers.valve));
            // and the liquipedia tier of the match is selected in settings
            let tierValid = (filters.tiers[`tier${match.tier}`])

            return (teamValid && valveValid && tierValid);
        }).sort(compareDate);
        // Save matches for popup
        browser.storage.local.set({matches});

        console.log(matches);  // Debug
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
    // Initialise default settings options               
    browser.storage.sync.set({
        tiers:{
            "valve": false,
            "tier1": true,
            "tier2": true,
            "tier3": false,
            "tier4": false
        },
        players:[],
        teams:[], 
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