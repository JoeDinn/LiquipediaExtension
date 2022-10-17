const baseRequest = "https://liquipedia.net/dota2/api.php?action=askargs&format=json&conditions=";
const afterFilter = "has map_date::>";
const beforeFilter = "has map_date::<";
const imageRequest = "https://liquipedia.net/dota2/api.php?action=askargs&format=json&conditions=%20%3A%2B%20%7CHas%20id%3A%3A";
const imageParameters = "&printouts=Has%20image&parameters=&api_version=2";

const printOut = encodeURIComponent("Has tournament type |Has teams |Has tournament tier |has map_date |has tournament |has team left |has team right |has match stream |has tournament icon |Has tournament name |Has team left score |Has team right score |Has match twitch |Has match afreeca |Has match afreecatv |Has match dailymotion |Has match douyu |Has match smashcast |Has match youtube |Has match huomao |Has match facebook |has player left |has player left page |has player left flag |has player left score |has player right |has player right page |has player right flag |has player right score |is individual tournament |Has game count |is valve premier");
const baseParameters = `&printouts=${printOut}%20&parameters=`;
const defaultFilters = "-Has subobject::+|:+|Has exact time::true|Is finished::false";
const sep = "%7C" // creates "|"            
const periodMinutes = 2;

async function redirect(requestDetails) {
    let value = await fetch(requestDetails.url.split("?")[0]);
    let text = await value.text();
    let parser = new DOMParser();

    // Parse the text
    let doc = parser.parseFromString(text, "text/html");
    let twitchURL = doc.querySelector('#stream iframe').src.split("&")[0].split("?");
    console.log(twitchURL);

    return {
        redirectUrl: "https://www.twitch.tv/" + twitchURL[1].split("=")[1] //TODO replace with regex
    };
}

// Japan uses yyyy/mm/dd hh:mm:ss then encode for url
function notify(count){
    browser.notifications.create({
        type: "basic",
        iconUrl: browser.extension.getURL("icons/active-48.png"),
        title: "Live matches!",
        message: `There ${count > 1?"are":"is"} ${count} live match${count > 1?"es":""}. Click the taskbar to check ${count > 1?"them":"it"} out.\n\nYou can turn off notifications in the settings.`,
    });
}

function dateString(date) {
    return date.toLocaleString("ja-JP");
}

function updateIcon(fill) {
    browser.browserAction.setIcon({
        path: fill ? {
            19: "/icons/active-19.png",
            38: "/icons/active-38.png"
        } : {
            19: "/icons/inactive-19.png",
            38: "/icons/inactive-38.png"
        }
    });
  
}

function httpGetAsync(theUrl, callback) {
    let xmlHttpReq = new XMLHttpRequest();
    xmlHttpReq.onreadystatechange = function () {
    if (xmlHttpReq.readyState == 4 && xmlHttpReq.status == 200)
        callback(xmlHttpReq.responseText);
    }
    xmlHttpReq.open("GET", theUrl, true); // true for asynchronous 
    xmlHttpReq.setRequestHeader("User-Agent", "Firefox Extension")
    xmlHttpReq.send(null);
}

function countOngoingMatches(matches) {
    currentTime = new Date().getTime().toString().slice(0,10); // Remove ms 

    return matches.reduce((accumulator, match) => {
        let matchTime = match.printouts["has map_date "][0].timestamp;
        return accumulator + (currentTime>matchTime);
    }, 0);

}

function checkTeams(teams, filterTeams) {
    teams.forEach((team, index) => {
        filterTeams.forEach((filterTeam, fIndex) => {
            if (filterTeam === team[0].fulltext) {
                return true
            }
        });
    });
    return false
}

async function getJSON(request, func) {
    let value = await fetch(request);
    console.log("?");
    value.json().then(func);
}

function getMatches(filters) {

    let now = new Date();
    let earlier = new Date();
    earlier.setHours(earlier.getHours() - 8);
    //filters.push(`${beforeFilter}${dateString(now)}`);
    let request = `${baseRequest}${encodeURIComponent(defaultFilters + `|${afterFilter}${dateString(earlier)}`)}${baseParameters}`;
    console.log(request);

    getJSON(request, (resultsJSON) => {
        let matches = Object.values(resultsJSON.query.results).sort(function(a, b){
            return a.printouts["has map_date "][0].timestamp - b.printouts["has map_date "][0].timestamp
        }).filter((match)=>{
            let teams = match.printouts["Has teams "];
            let tier = match.printouts["Has tournament tier "][0].fulltext;
            let valve = match.printouts["is valve premier "][0] === "t";

            let teamValid = (filters.teams.length == 0 || checkTeams(teams, filters.teams));
            let tierValid = ((valve && filters.tiers.valve) || filters.tiers[`tier${tier}`])

          return (teamValid && tierValid);
        });

        browser.storage.local.set({matches});/*
        matches.forEach((match, index) => {
          match.printouts["Has teams "].forEach((team, index) => {
            getJSON(`${imageRequest}${team.fulltext}${imageParameters}`, (resultJSON) => {
              team["image"] = resultJSON.query.results[team.fulltext].printouts["Has image"][0].fullurl;
            });
          })
        });*/
        console.log(matches); 
        browser.storage.local.get("ongoingMatches").then((item) => { //Add settings to disable
            let count = countOngoingMatches(matches);
            let ongoingMatches = (count > 0);
            let prevOngoingMatches = item.ongoingMatches;
          // Update icon
            updateIcon(ongoingMatches);
            if (!prevOngoingMatches && ongoingMatches) {
                browser.storage.local.get("matches").then((result) => {
                    if (result.notifications) {
                        notify(count);
                    }
                }, (error) => {console.log(error)});
            
            }
            browser.storage.local.set({ongoingMatches});
        }, (error) => {console.log(error)});        
    });

}
async function test() {
    let value = await fetch("https://liquipedia.net/dota2/Special:Stream/twitch/pgl_dota2_en3");
    let text = await value.text();
    let parser = new DOMParser();

  // Parse the text
    let doc = parser.parseFromString(text, "text/html");
    let docArticle = doc.querySelector('#stream iframe').src;
  // You can now even select part of that html as you would in the regular DOM 
  // Example:
  // 
    console.log(docArticle);
}
  //<div id="stream"><iframe src="https://player.twitch.tv/?channel=pgl_dota2en3&amp;parent=liquipedia.net" allowfullscreen="true" allow="autoplay; fullscreen" scrolling="no" width="100%" height="100%" frameborder="0"></iframe></div><iframe src="https://player.twitch.tv/?channel=pgl_dota2en3&amp;parent=liquipedia.net" allowfullscreen="true" allow="autoplay; fullscreen" scrolling="no" width="100%" height="100%" frameborder="0"></iframe>



function handleAlarm(alarmInfo) {
    console.log(alarmInfo.name);
  


    if (alarmInfo.name === "periodicUpdate") {
    // Get filters from settings
    // Get matches, update icon and notify
        browser.storage.sync.get(["tiers", "players", "teams"]).then(getMatches,(error)=>{console.log(error)});
    //["Has tournament tier::1"]);
    }
}



function start(){
    console.log("Ticktock");
    let ongoingMatches = false;
    browser.storage.local.set({ongoingMatches});

  // Start update clock
    browser.alarms.create("periodicUpdate",{
        "when": Date.now(),
        "periodInMinutes": periodMinutes,
    });
}

function init() {
  // Runs on installation
    test();
    //Set default options               
    browser.storage.sync.set({
        tiers:{
            "valve": true,
            "tier1": true,
            "tier2": true,
            "tier3": false,
            "tier4": false
        },
        players:[],
        teams:[], 
        notifications:false //TODO true
    });

    //Start running
    start();
}

browser.alarms.onAlarm.addListener(handleAlarm);
browser.runtime.onInstalled.addListener(init);
browser.runtime.onStartup.addListener(start);
browser.runtime.onMessage.addListener(start);
browser.webRequest.onBeforeRequest.addListener(
    redirect,
    {urls:["https://liquipedia.net/dota2/Special:Stream/twitch/*?redirect=true"]},
    ["blocking"]
);