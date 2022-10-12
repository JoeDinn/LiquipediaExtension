const baseRequest = "https://liquipedia.net/dota2/api.php?action=askargs&format=json&conditions=";
const afterFilter = "has map_date::>";
const beforeFilter = "has map_date::<";
const printOut = encodeURIComponent("Has tournament type |Has teams |Has tournament tier |has map_date |has tournament |has team left |has team right |has match stream |has tournament icon |Has tournament name |Has team left score |Has team right score |Has match twitch |Has match afreeca |Has match afreecatv |Has match dailymotion |Has match douyu |Has match smashcast |Has match youtube |Has match huomao |Has match facebook |has player left |has player left page |has player left flag |has player left score |has player right |has player right page |has player right flag |has player right score |is individual tournament |Has game count |is valve premier");
const baseParameters = `&printouts=${printOut}%20&parameters=`;
const defaultFilters = ["-Has subobject::+", ":+", "Has exact time::true"]; //, "Is finished::false"];
const sep = "%7C" // creates "|"            

  
// Japan uses yyyy/mm/dd hh:mm:ss then encode for url
  

function dateString(date) {
  return date.toLocaleString("ja-JP");
}

function updateIcon(fill) {
  browser.browserAction.setIcon({
    path: fill ? {
      19: "/icons/star-filled-19.png",
      38: "/icons/star-filled-38.png"
    } : {
      19: "/icons/star-empty-19.png",
      38: "/icons/star-empty-38.png"
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

function getMatches(filters) {

    let now = new Date();
    let earlier = new Date();
    earlier.setHours(earlier.getHours() - 8);
    filters = filters.concat(defaultFilters)
    filters.push(`${afterFilter}${dateString(earlier)}`);
    //filters.push(`${beforeFilter}${dateString(now)}`);
    let request = `${baseRequest}${encodeURIComponent(filters.join("|"))}${baseParameters}`;
    console.log(request);
    httpGetAsync(request, function(result){
        let matches = Object.values(JSON.parse(result).query.results).sort(function(a, b){
          return a.printouts["has map_date "][0].timestamp - b.printouts["has map_date "][0].timestamp
        });
        if (matches.length > 0) {
            updateIcon(true);
        }
        else
        {
          updateIcon(false);
        }
        console.log(matches);        
        browser.storage.local.set({matches});
    });

}
browser.runtime.onInstalled.addListener(() => {
  console.log("asdfg")
});

// Testing purposes
browser.tabs.onCreated.addListener(() => {
  // run startup function
  console.log("New tab")
  getMatches(["Has tournament tier::1"])
})
browser.runtime.onStartup.addListener(() => {
  // run startup function
  console.log("startup")
  getMatches(["Has tournament tier::1"])
})