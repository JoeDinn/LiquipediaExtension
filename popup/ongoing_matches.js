/**
 * CSS to hide everything on the page,
 * except for elements that have the "beastify-image" class.
 */
const hidePage = `body > :not(.beastify-image) {
                    display: none;
                  }`;
const twitchBase = "https://liquipedia.net/dota2/Special:Stream/twitch/"; //TODO "https://www.twitch.tv/";
const twitchIcon =  '<img src="/icons/twitch-16.png" alt="Twitch icon" width="16" height="16">';
const youtubeBase = "https://www.youtube.com/watch?v=";
const youtubeIcon =  '<img src="/icons/youtube-16.png" alt="Youtube icon" width="16" height="16">';
 

/**
 * Listen for clicks on the buttons, and send the appropriate message to
 * the content script in the page.
 */
function listenForClicks() {
  document.addEventListener("click", (e) => {
    /**
     * Insert the page-hiding CSS into the active tab,
     * then get the beast URL and
     * send a "beastify" message to the content script in the active tab.
     */
    function beastify(tabs) {
      browser.tabs.insertCSS({ code: hidePage }).then(() => {
        let url = beastNameToURL(e.target.textContent);
        browser.tabs.sendMessage(tabs[0].id, {
          command: "beastify",
          beastURL: url
        });
        updateIcon(false)
        
      
      });
    }

    /**
     * Just log the error to the console.
     */
    function reportError(error) {
      console.error(`Could not beastify: ${error}`);
    }

    /**
     * Get the active tab,
     * then call "beastify()" or "reset()" as appropriate.
     */
    if (e.target.classList.contains("beast")) {
      browser.tabs
        .query({ active: true, currentWindow: true })
        .then(beastify)
        .catch(reportError);
    } else if (e.target.classList.contains("reset")) {
      browser.tabs
        .query({ active: true, currentWindow: true })
        .then(reset)
        .catch(reportError);
    }
  });
}

/**
 * There was an error executing the script.
 * Display the popup's error message, and hide the normal UI.
 */
function reportExecuteScriptError(error) {
  console.log(`Failed to execute beastify content script: ${error.message}`);
  document.querySelector("#popup-content").classList.add("hidden");
  document.querySelector("#error-content").classList.remove("hidden");
  
}
function onError(error){
    // Handle error
}

function getLinks(match) {
    let twitchArr = match.printouts["Has match twitch "];
    let twitchLink =  (twitchArr.length == 1)?`<a href="${twitchBase}${twitchArr[0].toLowerCase()}">${twitchIcon}</a>`:"";
    let youtubeArr = match.printouts["Has match youtube "];
    let youtubeLink =  (youtubeArr.length == 1)?`<a href="${youtubeBase}${youtubeArr[0].split("/")[1]}">${youtubeIcon}</a>`:"";
    return `${twitchLink} ${youtubeLink}`
}
function getTimeDiff(currentTime, matchTime) {
    let timeDiff = Number(matchTime + "000") - currentTime.getTime(); 
    let rem;
    let hours = parseInt(timeDiff / (60 * 60 * 1000)); // ms + 100*s + 100*60*m + 100*60*60*h
    rem = timeDiff % (60 * 60 * 1000);
    let minutes = parseInt(rem / (60 * 1000));
    /*rem = rem % (60 * 1000)
    let seconds = parseInt(rem / 1000);*/
    return `${hours} hours and ${minutes} minutes`
}

function onLoad(item){
    //const beastImage = document.createElement("div");
    const matchesDiv = document.getElementById("matches");
    let html = '<div class="button beast">Frog</div>';
    let currentTime = new Date(); 
    let currentTimeString = currentTime.getTime().toString().slice(0,10); // Remove ms
    if (item.matches.length > 0){
        item.matches.forEach(function(match, index) {
            let teams = match.printouts["Has teams "]
            let leftScore = `[${match.printouts["Has team left score "][0]}]`;
            let rightScore = `[${match.printouts["Has team right score "][0]}]`;
            let matchTime = match.printouts["has map_date "][0].timestamp;
            let isOngoing = (currentTimeString>matchTime);
            let link = `${isOngoing?getLinks(match):""}`;
            let time = `${isOngoing? "Live" : getTimeDiff(currentTime, matchTime)}`;
            
            let teamsText = (teams.length > 1)? `${teams[0].fulltext} ${leftScore} vs ${rightScore} ${teams[1].fulltext}` : "TBD" //TODO icon
            let text =  `${teamsText}<br>${match.printouts["has tournament "][0].fulltext}`;
            matchesDiv.insertAdjacentHTML("beforeend", `<div class="${isOngoing?"ongoing":"upcoming"}">${text}<br>${time} ${link}<br></div><hr>`);

        });  //text
    }
    else {
        matchesDiv.insertAdjacentHTML("beforeend", "<div}>No matches to show</div>");
    }

}
/**
 * Run when the popup loads, inject a content script into the active tab,
 * and add a click handler.
 * If we couldn't inject the script, handle the error.
 */
browser.storage.local.get("matches").then(onLoad, onError);