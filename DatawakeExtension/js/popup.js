var dwUI = function () {

    var pub = {}; // object to hold public functions for this module

    var postId;  // the datawake post id the corresponds to this page visit

    var extracted_links = []; // array to hold extracted links
    var lookaheadStarted = false;// flag for if the link lookahead polling has started
    var lookaheadLinks = [];
    // /var domainSearchResults = []  //array to store the domain specific search results


    /**
     * Capture an Image from the current page (not currently supported)
     */
    var imageDataURI;
    var captureImage = function () {
        chrome.tabs.captureVisibleTab(function (dataUrl) {
            imageDataURI = dataUrl
            var myCanvas = document.getElementById('screenCanvas');
            var ctx = myCanvas.getContext('2d');
            var img = new Image;
            img.onload = function () {
                ctx.drawImage(img, 0, 0); // Or at whatever offset you like
            };
            img.src = imageDataURI

        });


    };
    pub.captureImage = captureImage;


    /**
     * Retrieve the user ranking of the current page within the org/trail context
     * @param callback
     */
    var getUrlRank = function (callback) {
        chrome.tabs.query({active: true}, function (tabs) {
            chrome.runtime.sendMessage({operation: "get-popup-data", tab: tabs[0]}, function (response) {
                var data = JSON.stringify({
                    trailname: response.trail,
                    url: tabs[0].url,
                    domain: response.domain
                });
                console.log("datawake-popup getUrlRank submit reguest for: " + data);
                $.ajax({
                    type: "POST",
                    url: response.rankUrl + "/getRank",
                    data: data,
                    dataType: 'json',
                    contentType: 'application/json',
                    success: function (response) {
                        console.log("datawake-popup getUrlRank -> " + response);
                        callback(response.rank);
                    },
                    error: function (jqxhr, textStatus, reason) {
                        console.log("datawake_url_rank GET - error " + textStatus + " " + reason);
                    }
                })
            })
        })
    };
    pub.getUrlRank = getUrlRank;


    var getDomainOrgData = function () {
        chrome.tabs.query({active: true}, function (tabs) {
            chrome.runtime.sendMessage({operation: "get-popup-data", tab: tabs[0]}, function (response) {
                var trail = response.trail;
                var domain = response.domain;

                var p = d3.select("#domain_trail_info");
                p.append("div").text("Domain: " + domain);
                p.append("div").text("Trail: " + trail);
            })
        })
    };
    pub.getDomainOrgData = getDomainOrgData;


    /**
     * Set the user ranking of the current page withing the org/trail context
     * @param rank
     */
    var setUrlRank = function (rank) {
        chrome.tabs.query({active: true}, function (tabs) {
            chrome.runtime.sendMessage({operation: "get-popup-data", tab: tabs[0]}, function (response) {
                var data = JSON.stringify({
                    trailname: response.trail,
                    url: decodeURIComponent(tabs[0].url),
                    rank: rank,
                    domain: response.domain
                });
                console.log("datawake-popup setUrlRank submit reguest for: " + data);
                $.ajax({
                    url: response.rankUrl + "/setRank",
                    type: "POST",
                    data: data,
                    dataType: 'json',
                    contentType: 'application/json',
                    success: function (response) {
                        if (response.success) {
                            console.log("datawake-popup setUrlRank -> " + response);
                        }
                    },
                    error: function (jqxhr, textStatus, reason) {
                        console.log("datawake_url_rank POST - error " + textStatus + " " + reason);
                    }
                })
            })
        })
    };
    pub.setUrlRank = setUrlRank;


    /**
     * Match extracted links against the lookahead database.
     * @param links
     * @param index
     */
    var linkLookahead = function (srcurl, links, index, domain, delay) {
        //console.log("lookahead: "+JSON.stringify(links))
        console.log("linkLookahead: size" + links.length + " index: " + index + " delay: " + delay);
        var url = chrome.extension.getBackgroundPage().config.datawake_serviceUrl + "/lookahead/matches";
        d3.select("#lookahead").select("h2").attr("style", "display: inline;");
        //d3.select("#lookahead_progress").text("loading: "+links.length+"...")
        var jsonData = JSON.stringify({url: links[index], srcurl: srcurl, domain: domain });
        $.ajax({
            type: "POST",
            url: url,
            data: jsonData,
            dataType: 'json',
            contentType: 'application/json',
            success: function (responseObj) {
                if (responseObj && responseObj != undefined) {
                    //console.log("linkLookahead SUCCESS, response: "+response)

                    // if there was a match add it to the list
                    if (responseObj.matchCount > 0 || responseObj.domain_search_hits > 0 || responseObj.hitlist.length > 0) {
                        lookaheadLinks.push(responseObj);

                        // re order based on match count
                        lookaheadLinks.sort(function (a, b) {
                            return b.matchCount - a.matchCount;
                        });
                        lookaheadLinks.sort(function (a, b) {
                            return b.domain_search_hits - a.domain_search_hits;
                        });
                        lookaheadLinks.sort(function (a, b) {
                            return b.hitlist.length - a.hitlist.length;
                        });

                        // append new elements and re order.
                        var selection = d3.select("#lookahead_results").selectAll("div")
                            .data(lookaheadLinks, function (d) {
                                return d.url
                            });

                        var divs = selection.enter().append("div");

                        divs.append("a")
                            .attr("href", function (d) {
                                return d.url
                            })
                            .attr("target", "blank")
                            .text(function (d) {
                                return d.url
                            });

                        if (responseObj.hitlist.length > 0) {
                            var hitlist_matches = divs.append("div");

                            hitlist_matches.append("button").text(function (d) {
                                return "hit list: " + d.hitlist.length
                            })
                                .attr("style", "display:block; margin-left: 25px;")
                                .on("click", function () {
                                    if (!this.clicked) {
                                        this.clicked = true
                                        d3.select(this.parentNode).selectAll("div").attr("style", "display:block; margin-left: 25px;")
                                    }
                                    else {
                                        this.clicked = false
                                        d3.select(this.parentNode).selectAll("div").attr("style", "display:none;")
                                    }
                                });
                            hitlist_matches.append("div").selectAll("div").data(function (d) {
                                return d.hitlist
                            }).enter().append("div")
                                .text(function (d) {
                                    return d
                                })
                                .attr("style", "display: none;");
                        }


                        if (responseObj.domain_search_hits > 0) {
                            var domain_matches = divs.append("div");

                            domain_matches.append("button").text(function (d) {
                                return "domain search hits: " + d.domain_search_hits
                            })
                                .attr("style", "display:block; margin-left: 25px;")
                                .on("click", function () {
                                    if (!this.clicked) {
                                        this.clicked = true
                                        d3.select(this.parentNode).selectAll("div").attr("style", "display:block; margin-left: 25px;")
                                    }
                                    else {
                                        this.clicked = false
                                        d3.select(this.parentNode).selectAll("div").attr("style", "display:none;")
                                    }
                                });
                            domain_matches.append("div").selectAll("div").data(function (d) {
                                return d.domain_search_matches
                            }).enter().append("div")
                                .text(function (d) {
                                    return d
                                })
                                .attr("style", "display: none;");
                        }


                        if (responseObj.matchCount > 0) {
                            var matches = divs.append("div");
                            matches.append("button").text(function (d) {
                                return "shared entities: " + d.matchCount
                            })
                                .attr("style", "display:block; margin-left: 25px;")
                                .on("click", function () {
                                    if (!this.clicked) {
                                        this.clicked = true
                                        d3.select(this.parentNode).selectAll("div").attr("style", "display:block; margin-left: 25px;")
                                    }
                                    else {
                                        this.clicked = false
                                        d3.select(this.parentNode).selectAll("div").attr("style", "display:none;")
                                    }
                                });


                            matches.append("div").selectAll("div").data(function (d) {
                                return d.matches
                            }).enter().append("div")
                                .text(function (d) {
                                    return d
                                })
                                .attr("style", "display: none;");

                        }

                        selection.order();
                    }

                    // check for the next url
                    links.splice(index, 1);
                    if (links.length > 0) {
                        if (index >= links.length) {
                            index = 0;
                            if (delay <= 5 * 60 * 1000) {
                                window.setTimeout(function () {
                                    linkLookahead(srcurl, links, index, domain, delay * 2)
                                }, delay);
                            }
                        }
                        else {
                            linkLookahead(srcurl, links, index, domain, delay);
                        }
                    }
                    else {
                        d3.select("#lookahead_progress").text("")
                    }
                }
                else {
                    //console.log("linkLookahead URL not found, trying again.")
                    index = (index + 1) % links.length;
                    if (index == 0) {
                        // pause for the delay at the begining of the list
                        if (delay <= 5 * 60 * 1000) {
                            window.setTimeout(function () {
                                linkLookahead(srcurl, links, index, domain, delay * 2)
                            }, delay);
                        }
                    }
                    else {
                        window.setTimeout(function () {
                            linkLookahead(srcurl, links, index, domain, delay)
                        }, 1);
                    }


                }

            },

            error: function (jqxhr, textStatus, reason) {
                //on error wait half a second and try the next item in the array
                console.log("linkLookahead ERROR, response: " + textStatus + ", " + reason);
            }
        })
    };


    /**
     * create the star rating widget
     * @param startingRate
     */
    var createStarRating = function (startingRate) {

        d3.select("#star_rating").attr("data-average", startingRate);

        $("#star_rating").jRating({
            type: 'big', // type of the rate.. can be set to 'small' or 'big'
            length: 10, // nb of stars
            rateMax: 10,
            sendRequest: false,
            canRateAgain: true,
            nbRates: 9999999,
            onClick: function (element, rate) {
                setUrlRank(rate);
                $("#url_rank_text").text(rate + " / 10");
            }
        });

    };
    pub.createStarRating = createStarRating;


    /**
     * Get extracted page entities, poll until the are available
     */
    var fetchEntities = function (delay) {
        console.log("fetchEntities(" + delay + ")");

        chrome.tabs.query({active: true}, function (tabs) {
            var domain = chrome.extension.getBackgroundPage().dwState.tabToDomain[tabs[0].id];
            $.ajax({
                type: "POST",
                url: chrome.extension.getBackgroundPage().config.datawake_serviceUrl + "/visited_url_entities/entities",
                data: JSON.stringify({ url: tabs[0].url, domain: domain}),
                dataType: 'json',
                contentType: 'application/json',
                success: function (extracted_entities_dict) {
                    //console.log("fetchEntities() response = "+response)
                    d3.select("#domain_extracted_entities").selectAll("div").remove();
                    d3.select("#all_extracted_entities").selectAll("div").remove();


                    // start link lookahead
                    if (!lookaheadStarted && 'website' in extracted_entities_dict) {
                        lookaheadStarted = true;
                        var linksarray = Object.keys(extracted_entities_dict['website']);
                        window.setTimeout(function () {
                            chrome.tabs.query({active: true}, function (tabs) {
                                linkLookahead(tabs[0].url, linksarray, 0, domain, 1000);
                            });
                        }, 1);
                    }


                    // domain relevant entities
                    var rdiv = d3.select("#domain_extracted_entities").append("div");

                    var entities_in_domain = [];
                    for (var type in extracted_entities_dict) {
                        for (var name in extracted_entities_dict[type]) {
                            if (extracted_entities_dict[type][name] == "y") {
                                var entity = {type: type, name: name};
                                entities_in_domain.push(entity);
                            }
                        }
                    }
                    if (entities_in_domain.length > 0) {
                        rdiv.append("h3").text("Extracted Entities found in Domain");
                    }
                    var rows = rdiv.append("table").attr("border", 1).selectAll("tr").data(entities_in_domain).enter().append("tr");
                    rows.append("td")
                        .text(function (d) {
                            return d.type + ":" + d.name
                        });
                    loadExternalLinks(rows)



                    // All Extracted entities (NON-MITIE)
                    var mdiv = d3.select("#all_extracted_entities").append("div");
                    //mdiv.append("h2").text("Extracted Entities");

                    var keys = Object.keys(extracted_entities_dict)
                    if (keys.indexOf("info") != -1){
                        keys.splice(keys.indexOf("info"),1)
                    }
                    var types = mdiv.selectAll("div").data(keys).enter().append("div");

                    types.each(function (d) {
                        var div = d3.select(this);
                        div.append("h3").html('<u>' + d + '</u>');
                        var values = Object.keys(extracted_entities_dict[d]);
                        div.append("table").selectAll("tr")
                            .data(values).enter().append("tr")
                            .html(function (j) {
                               return j;
                            })
                            .style("font-weight", function (j) {
                                //console.log(extracted_entities_dict[d][j])
                                if (extracted_entities_dict[d][j] == "y") {
                                    return 'bold';
                                }
                                else {
                                    return 'normal';
                                }
                            });

                    });


                    // MITIE extracted entities
                    if ("info" in extracted_entities_dict){
                        d3.select("#mitie-info-div").selectAll("div").remove()
                        var mdiv = d3.select("#mitie-info-div").append("div");
                        //mdiv.append("h2").text("Extracted Info");

                        var legend = mdiv.append("div")
                        legend.append("hr")
                        legend.append("h3").text("Legend:")
                        legend.append("div").html("<font size=3 weight=bold color=purple>PERSON</font>")
                        legend.append("div").html("<font size=3 weight=bold color=lime>LOCATION</font>")
                        legend.append("div").html("<font size=3 weight=bold color=orange>ORGANIZATION</font>")
                        legend.append("div").html("<font size=3 weight=bold color=maroon>MISC</font>")
                        legend.append("hr")

                        var types = mdiv.append("div").selectAll("div").data(["info"]).enter().append("div");

                        types.each(function (d) {
                            var div = d3.select(this);
                            var values = Object.keys(extracted_entities_dict[d]);
                            div.append("table")
                                .selectAll("tr")
                                .data(values).enter().append("tr")
                                .html(function (j) {
                                    if (d != 'info'){ return j; }
                                    else {
                                        var color = 'black';
                                        var etype = j.split(' -> ')[0];
                                        var term =  j.split(' -> ')[1];
                                        var size = j.split(' -> ')[2];
                                        if ( etype == 'PERSON' ) { color = 'purple';}
                                        if ( etype == 'LOCATION' ) { color = 'lime';}
                                        if ( etype == 'ORGANIZATION' ) { color = 'orange';}
                                        if ( etype == 'MISC' ) { color = 'maroon';}
                                        return "<font size='" + size + "' color='" + color + "'>" + term + "</font>";
                                    }
                                })
                                .attr("title",function(k) {return k})
                                .style("font-weight", function (j) {
                                    //console.log(extracted_entities_dict[d][j])
                                    if (extracted_entities_dict[d][j] == "y") {
                                        return 'bold';
                                    }
                                    else {
                                        return 'normal';
                                    }
                                });

                        });
                    }





                    // poll for awhile.. stop after the interval is more than 5 minutes
                    if (delay <= 5 * 60 * 1000) {
                        window.setTimeout(fetchEntities, 2 * delay);
                    }


                }, error: function (jqxhr, textStatus, reason) {
                    console.log("fetchEntities() - error " + textStatus + " " + reason);
                }
            })

        })
    };
    pub.fetchEntities = fetchEntities;


    // load external links provided by the server for each key value pair
    var loadExternalLinks = function(rows){
        $.ajax({
            type: "GET",
            url: chrome.extension.getBackgroundPage().config.datawake_serviceUrl + "/external_links/get",
            contentType: 'application/json',
            dataType: 'json',
            success: function (links) {
                if (links.length > 0) {
                    for (j in links){
                        linkObj = links[j]
                        rows.append("td").append("a")
                            .text(linkObj.display)
                            .attr("href", function (d) {
                                var link = linkObj.link.replace("$VALUE", encodeURI(d.name))
                                link = link.replace("$ATTR", encodeURI(d.type))
                                return link
                            })
                            .attr("target", "_blank");

                    }
                }
                else{
                    rows.append("td").text("No external tools available.")
                }
            },
            error: function (jqxhr, textStatus, reason) {
                console.log("external link error " + textStatus + " " + reason);
            }
        });

    }



    return pub;

}();


window.onload = function () {

    var signinCallback = function (userInfo) {

        // set up the rank slider
        dwUI.getUrlRank(function (rank) {
            dwUI.createStarRating(rank)
            $("#url_rank_text").text(rank + " / 10")

        })
    }

    googlePlusUserLoader.onload(signinCallback);
    dwUI.getDomainOrgData()
    dwUI.fetchEntities(500)


}

