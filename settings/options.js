const limit = 20; // 2500
const playerRequest = `https://liquipedia.net/dota2/api.php?action=askargs&format=json&conditions=%3A%2B%7CHas%20role%3A%3A!Caster%7CHas%20earnings%3A%3A%3E10%2C000%7CHas%20status%3A%3AActive&printouts=Has%20id%7CHas%20region%7CHas%20teamid%7CHas%20dota2%7CHas%20team&parameters=limit%3D${limit}&api_version=2`;
const teamRequest = `https://liquipedia.net/dota2/api.php?action=askargs&format=json&conditions=%3A%2B%7CIs%20active%3A%3Atrue%7CHas%20teamid%3A%3A%3E0&printouts=Has%20id%7CHas%20region%7CHas%20teamid%7CHas%20dota2&parameters=limit%3D${limit}&api_version=2`;


/*
Load current selected options from storage and add to HTML
*/
async function restoreOptions()
{
    /*
    Add current choices to HTML
    */
    function setCurrentChoice(result)
    {
        // Tiers
        document.querySelector("#valve").checked = result.tiers.valve;
        document.querySelector("#tier1").checked = result.tiers.tier1;
        document.querySelector("#tier2").checked = result.tiers.tier2;
        document.querySelector("#tier3").checked = result.tiers.tier3;
        document.querySelector("#tier4").checked = result.tiers.tier4;
                //notifications
        document.querySelector("#notifications").checked = result.notifications;
    }
  // Load saved options
  let getting = browser.storage.sync.get(["tiers", "notifications"]);
  getting.then(setCurrentChoice, (error)=>{console.log(`Error: ${error}`)});
}

/*
Save the current selected options
*/
function saveOptions(e)
{
    e.preventDefault();  //Prevent button default behaviour
    browser.storage.sync.set({
        tiers:{
            "valve": document.querySelector("#valve").checked,
            "tier1": document.querySelector("#tier1").checked,
            "tier2": document.querySelector("#tier2").checked,
            "tier3": document.querySelector("#tier3").checked,
            "tier4": document.querySelector("#tier4").checked
        },
        notifications:document.querySelector("#notifications")
    });
    // Send a message to the background to reload the matches
    // with new filters applied
    browser.runtime.sendMessage("RELOAD");
}

/*
Restore options to default
*/
function resetOptions(e)
{
    e.preventDefault();  //Prevent button default behaviour
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

    // Send a message to the background to reload the matches
    // with new filters applied
    browser.runtime.sendMessage("RELOAD");
    restoreOptions();
}


/*
Make a series of HTTP requests and return JSON for each
*/
function getJSON(arr, func)
{
    console.log(arr);
    Promise.all(arr.map(async (request) => {return fetch(request)})).then((values) => {
        console.log(values);
        Promise.all(values.map(async (value) => {return await value.json()})).then(func);
    });
}

// Listeners
document.addEventListener("DOMContentLoaded", restoreOptions); // Run when settings page loaded
document.querySelector("form").addEventListener("submit", saveOptions); //Run when save button pressed
document.querySelector("form").addEventListener("reset", resetOptions); //Run when reset button pressed