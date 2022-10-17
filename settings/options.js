const limit = 20; // 2500
const playerRequest = `https://liquipedia.net/dota2/api.php?action=askargs&format=json&conditions=%3A%2B%7CHas%20role%3A%3A!Caster%7CHas%20earnings%3A%3A%3E10%2C000%7CHas%20status%3A%3AActive&printouts=Has%20id%7CHas%20region%7CHas%20teamid%7CHas%20dota2%7CHas%20team&parameters=limit%3D${limit}&api_version=2`;
const teamRequest = `https://liquipedia.net/dota2/api.php?action=askargs&format=json&conditions=%3A%2B%7CIs%20active%3A%3Atrue%7CHas%20teamid%3A%3A%3E0&printouts=Has%20id%7CHas%20region%7CHas%20teamid%7CHas%20dota2&parameters=limit%3D${limit}&api_version=2`;

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
        players:[], //TODO
        teams:[], 
        notifications:document.querySelector("#notifications")
    });
    // Send a message to the background to reload the matches
    // with new filters applied
    browser.runtime.sendMessage("RELOAD");
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

// Autocomplete function to make input field more user friendly
// from here: https://www.w3schools.com/howto/howto_js_autocomplete.asp
function autocomplete(div, arr, added)
{
    var currentFocus;
    let inp = div.querySelector("input");  // The input field
    let list = div.querySelector("ul");  // The list to add to

    /*
    Update the displayed list with the current content
    */
    function updateList() {
        list.innerHTML = "";
        added.forEach(function(item, index) {
            newItem = document.createElement("li");
            newItem.innerHTML = item;
            // Add a listener to remove the item if clicked on
            newItem.addEventListener("click", function(e)
            {
                let index = added.indexOf(this.innerHTML);
                if (index !== -1) {
                    added.splice(index, 1);
                }
                updateList();
            });
            list.appendChild(newItem)
        });
    }
    updateList();
    /*execute a function when someone writes in the text field:*/
    inp.addEventListener("input", function(e)
    {
        var a, b, i, val = this.value;
        /*close any already open lists of autocompleted values*/
        closeAllLists();

        if (!val) { return false;}

        currentFocus = -1;
        /*create a DIV element that will contain the items (values):*/
        a = document.createElement("DIV");
        a.setAttribute("id", this.id + "autocomplete-list");
        a.setAttribute("class", "autocomplete-items");
        /*append the DIV element as a child of the autocomplete container:*/
        this.parentNode.appendChild(a);
        /*for each item in the array...*/
        console.log(arr.length)
        for (i = 0; i < arr.length; i++) {
        /*check if the item starts with the same letters as the text field value:*/
        /* TODO check any substring*/
        if (arr[i].substr(0, val.length).toUpperCase() == val.toUpperCase()){
            /*create a DIV element for each matching element:*/
            b = document.createElement("DIV");
            /*make the matching letters bold:*/
            b.innerHTML = "<strong>" + arr[i].substr(0, val.length) + "</strong>";
            b.innerHTML += arr[i].substr(val.length);
            /*insert a input field that will hold the current array item's value:*/
            b.innerHTML += "<input type='hidden' value='" + arr[i] + "'>";
            /*execute a function when someone clicks on the item value (DIV element):*/
            b.addEventListener("click", function(e) {
            /*insert the value for the autocomplete text field:*/
            added.push(this.getElementsByTagName("input")[0].value);
            updateList();
            inp.value = "";
            /*close the list of autocompleted values,
            (or any other open lists of autocompleted values:*/

            closeAllLists();
            });
            a.appendChild(b);
        }
        }
    });
    /*execute a function presses a key on the keyboard:*/
    inp.addEventListener("keydown", function(e)
    {
      var x = document.getElementById(this.id + "autocomplete-list");
      if (x) x = x.getElementsByTagName("div");
      if (e.keyCode == 40) {
        /*If the arrow DOWN key is pressed,
        increase the currentFocus variable:*/
        currentFocus++;
        /*and and make the current item more visible:*/
        addActive(x);
      } else if (e.keyCode == 38) { //up
        /*If the arrow UP key is pressed,
        decrease the currentFocus variable:*/
        currentFocus--;
        /*and and make the current item more visible:*/
        addActive(x);
      } else if (e.keyCode == 13) {
        /*If the ENTER key is pressed, prevent the form from being submitted,*/
        e.preventDefault();
        if (currentFocus > -1) {
          /*and simulate a click on the "active" item:*/
          if (x) x[currentFocus].click();
        }
      }
    });
    function addActive(x)
    {
    console.log("addActive")
    /*a function to classify an item as "active":*/
    if (!x) return false;
    /*start by removing the "active" class on all items:*/
    removeActive(x);
    if (currentFocus >= x.length) currentFocus = 0;
    if (currentFocus < 0) currentFocus = (x.length - 1);
    /*add class "autocomplete-active":*/
    x[currentFocus].classList.add("autocomplete-active");
    }
    function removeActive(x) {
    console.log("removeActive")
    /*a function to remove the "active" class from all autocomplete items:*/
    for (var i = 0; i < x.length; i++) {
      x[i].classList.remove("autocomplete-active");
    }
    }
    function closeAllLists(elmnt)
    {
        /*close all autocomplete lists in the document,
        except the one passed as an argument:*/
        var x = document.getElementsByClassName("autocomplete-items");
        for (var i = 0; i < x.length; i++)
        {
            if (elmnt != x[i] && elmnt != inp)
            {
                x[i].parentNode.removeChild(x[i]);
            }
        }
    }
    /*execute a function when someone clicks in the document:*/
    document.addEventListener("click", function (e)
    {
        closeAllLists(e.target);
    });
}

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
        // Favourite teams
        let teamsList = document.getElementById("teamsList")
        // Favourite players
        let playersList = document.getElementById("playersList")
        //notifications
        document.querySelector("#notifications").checked = result.notifications;
        // Fetch players and teams for autocomplete
        getJSON([playerRequest, teamRequest], (JSONValues) => 
        {
            console.log(JSONValues);
            let players = JSONValues[0].query.results;
            let teams = JSONValues[1].query.results;
            autocomplete(document.getElementById("teams"), Object.keys(teams), result.teams);
            autocomplete(document.getElementById("players"), Object.keys(players), result.players);
        });
    }

  // Load saved options
  let getting = browser.storage.sync.get(["tiers", "players", "teams", "notifications"]);
  getting.then(setCurrentChoice, (error)=>{console.log(`Error: ${error}`)});
}

// Listeners
document.addEventListener("DOMContentLoaded", restoreOptions); // Run when settings page loaded
document.querySelector("form").addEventListener("submit", saveOptions); //Run when save button pressed