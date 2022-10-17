const twitchBase = "https://liquipedia.net/dota2/Special:Stream/twitch/";
const twitchQuery = "?redirect=true";
const twitchIcon =  '<img src="/icons/twitch-16.png" alt="Twitch icon" width="16" height="16">';
const youtubeBase = "https://www.youtube.com/watch?v=";
const youtubeIcon =  '<img src="/icons/youtube-16.png" alt="Youtube icon" width="16" height="16">';

function onError(error){
    console.log(error);
    // Handle error
}

function getLinks(match) {
    let twitchArr = match.printouts["Has match twitch "];
    let twitchLink =  (twitchArr.length == 1)?`<a href="${twitchBase}${twitchArr[0].toLowerCase()}${twitchQuery}">${twitchIcon}</a>`:"";
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
function deGlossify(teamResult) {
    let team = teamResult[0].fulltext;
    return (team === "Glossary")?"TBD":team
}

function onLoad(item){
    //const beastImage = document.createElement("div");
    const matchesDiv = document.getElementById("matches");
    let html = '<div class="button beast">Frog</div>';
    let currentTime = new Date(); 
    let currentTimeString = currentTime.getTime().toString().slice(0,10); // Remove ms
    if (item.matches.length > 0){
        item.matches.forEach(function(match, index) {
            let teamLeft = deGlossify(match.printouts["has team left "]);
            let teamRight = deGlossify(match.printouts["has team right "]);
            let leftScore = `[${match.printouts["Has team left score "][0]}]`;
            let rightScore = `[${match.printouts["Has team right score "][0]}]`;
            let matchTime = match.printouts["has map_date "][0].timestamp;
            let isOngoing = (currentTimeString>matchTime);
            let link = `${isOngoing?getLinks(match):""}`;
            let time = `${isOngoing? "Live" : getTimeDiff(currentTime, matchTime)}`;
            
            let teamsText = `${teamLeft} ${leftScore} vs ${rightScore} ${teamRight}` //TODO icon
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