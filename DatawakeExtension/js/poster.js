var dwPoster = function () {
    var pub = {};

    pub.resp = null;


    function do_post() {
        chrome.runtime.sendMessage({operation: "get-poster-data"}, function (response) {
            console.log("dwPoster-DO POST");

            if (!response.tracking) {
                console.log("Datawake - tracking disabled. Not posting data.");
                return
            }
            console.log('POSTER DATA');
            console.log(response);
            var data = JSON.stringify({
                cookie: document.cookie,
                html: $('body').html(),
                url: response.url,
                userName: response.userName,
                domain: response.domain,
                trail: response.trail
            });

            console.log("datawake - poster: submit post. trail:  " + response.trail + " service: " + response.serviceUrl);
            $.ajax({
                type: "POST",
                url: response.serviceUrl + "/scrape",
                data: data,
                contentType: 'application/json',
                dataType: 'json',
                success: function (response) {
                    console.log("datawake poster - " + JSON.stringify(response));
                    chrome.runtime.sendMessage({operation: "last-id", id: response.id, count: response.count}, null);
                },
                error: function (jqxhr, textStatus, reason) {
                    console.log("POST-scrape error " + textStatus + " " + reason);
                }
            })
        })
    }

    pub.do_post = do_post;


    return pub;

}();


// delay the post to get slow loading content
window.setTimeout(function () {
    dwPoster.do_post()
}, 1000);


chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        if (request.operation == "highlighttext") {
            var extracted_entities_dict = request.extracted_entities_dict;
            //console.log(extracted_entities_dict);
            var i = 1;

            if (Object.keys(extracted_entities_dict).length > 0){
                $.ajax({
                    type: "GET",
                    url: request.serviceUrl + "/external_links/get",
                    contentType: 'application/json',
                    dataType: 'json',
                    success: function (links) {
                        console.log("LINKS")
                        console.log(links)

                        for (key in extracted_entities_dict) {
                            for (value in extracted_entities_dict[key]) {

                                if ("y" == extracted_entities_dict[key][value]) {

                                    $('body').highlight(value, 'datawake-highlight-' + i);

                                    if (links.length > 0) {

                                        var content = '<div> <h4>' + key + ":" + value + '</h4>'
                                        for (j in links) {
                                            var linkObj = links[j]
                                            var link = linkObj.link
                                            link = link.replace("$ATTR", encodeURI(key))
                                            link = link.replace("$VALUE", encodeURI(value))
                                            content = content + '<a href="' + link + '" target="_blank">'+linkObj.display+'</a><br>'
                                        }
                                        content = content + '</div>'
                                        $('.datawake-highlight-' + i).tooltipster({
                                            content: $(content),
                                            animation: 'fade',
                                            interactive: true,
                                            delapy: 200,
                                            theme: 'tooltipster-noir',
                                            trigger: 'hover'
                                        });

                                    }


                                    else {
                                        $('.datawake-highlight-' + i).tooltipster({
                                            content: $('<div>' +
                                                    '<h4>' + key + ":" + value + '</h4>' +
                                                    'no external tools available'+
                                                    '</div>'
                                            ),
                                            animation: 'fade',
                                            interactive: true,
                                            delapy: 200,
                                            theme: 'tooltipster-noir',
                                            trigger: 'hover'
                                        });
                                    }




                                    i = i + 1
                                }
                            }
                        }
                        sendResponse({result: "ok"});
                    },
                    error: function (jqxhr, textStatus, reason) {
                        console.log("external link error " + textStatus + " " + reason);
                        sendResponse({result: "error"});
                    }
                })
            }



        }
    });

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse){
    if(request.operation == "selections"){
        var selections = request.selections;
        console.log(selections);
        for(item in selections){
            $('body').highlight(selections[item]);
        }
        sendResponse({result: "ok"});
    }
});
