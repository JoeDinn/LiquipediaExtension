// Hyperlinks and icons for streams
const twitchBase = "https://liquipedia.net/dota2/Special:Stream/twitch/";
const twitchQuery = "?redirect=true";
const twitchIcon =  '<img src="/icons/twitch-16.png" alt="Twitch icon" width="16" height="16">';
const youtubeBase = "https://www.youtube.com/watch?v=";
const youtubeIcon =  '<img src="/icons/youtube-16.png" alt="Youtube icon" width="16" height="16">';

/*
Create the hyperlinks for the twitch and youtube streams
*/
function getLinks(match)
{   
    // If available make twitch hyperlink with query to redirect
    let twitchLink = (match.twitch === "")?"":
        `<a href="${twitchBase}${match.twitch}${twitchQuery}">${twitchIcon}</a>`;
    // If available make youtube hyperlink
    let youtubeLink = (match.youtube === "")?"":
        `<a href="${youtubeBase}${match.youtube}">${youtubeIcon}</a>`;

    return `${twitchLink} ${youtubeLink}`
}

/*
Get the time until the match starts
*/
function getTimeDiff(currentTime, matchTime)
{
    // Subtract current time then convert to minutes
    let timeDiff = (Number(matchTime) - (currentTime.getTime()/1000))/60;  // current time gives ms
    let hours = parseInt(timeDiff / 60);
    let minutes = parseInt(timeDiff % 60);
    return `${hours} hours and ${minutes} minutes`
}

/*
Populate popup with ongoing and upcoming matches
*/
function onLoad(item)
{
    // Find 
    const matchesDiv = document.getElementById("matches");
    let currentTime = new Date(); 
    let currentTimeString = currentTime.getTime().toString().slice(0,10);  // Remove ms
    // If there are matches iterate over them
    if (item.matches.length > 0)
    {
        item.matches.forEach(function(match, index)
        {
            let isOngoing = (currentTimeString>match.date);  // Match is currently playing
            let cls = (isOngoing)?"ongoing":"upcoming";
            // Get and format match data
            let link = `${isOngoing?getLinks(match):""}`;
            let time = `${isOngoing? "Live" : getTimeDiff(currentTime, match.date)}`;
            let teamsText = `${match.teamLeft} [${match.scoreLeft}] vs [${match.scoreRight}] ${match.teamRight}`  // TODO icon
            let text = `${teamsText}<br>${match.tournament}`;
            // Add element to popup
            matchesDiv.insertAdjacentHTML("beforeend", `<div class="${cls}">${text}<br>${time} ${link}<br></div><hr>`);
        });
    }
    // Otherwise insert a placeholder
    else {
        matchesDiv.insertAdjacentHTML("beforeend", "<div}>No matches to show</div>");
    }
}
/*
 * Run when the popup loads, Shows all the current games
 */
browser.storage.local.get("matches").then(onLoad, (error)=>{console.log(error)});