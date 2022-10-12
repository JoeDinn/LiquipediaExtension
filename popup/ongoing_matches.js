/**
 * CSS to hide everything on the page,
 * except for elements that have the "beastify-image" class.
 */
const hidePage = `body > :not(.beastify-image) {
                    display: none;
                  }`;

 

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
function onError(matches){
    // Handle error
}

function onLoad(item){
    //const beastImage = document.createElement("div");
    const matchesDiv = document.getElementById("matches");
    let html = '<div class="button beast">Frog</div>';
    currentTime = new Date().getTime().toString().slice(0,10); // Remove ms
    if (item.matches.length > 0){
        item.matches.forEach(function(match, index) {
            teams = match.printouts["Has teams "]
            matchTime = match.printouts["has map_date "][0].timestamp;
            //console.log([currentTime, matchTime, (currentTime>matchTime)])
            let text = (teams.length > 1)? `${teams[0].fulltext} vs ${teams[1].fulltext}` : `${match.printouts["has tournament "][0].fulltext}`;
            matchesDiv.insertAdjacentHTML("beforeend", `<div class="${(currentTime>matchTime)?"ongoing":"upcoming"}">${text}</div>`);
        });  
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