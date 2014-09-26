/**
 * Load the UI once a session has been established with the datawake server
 */
function onLoggedIn() {
    $(function () {

        $('#domain_select').chosen({'width': '100%'});
        $('#domain_select').change(function () {
            var domain = $("#domain_select").val();
            set_selected_domain(domain);
        });

        $('#trail_select').chosen({'width': "100%"});
        $('#trail_select').change(function () {
            var trail = $("#trail_select").val();
            set_selected_trail(trail);
        })
    });


    // get the most recently used trail
    chrome.runtime.sendMessage({operation: "get-domain-and-trail"}, function (response) {
        if (null == response.domain || undefined == response.domain) {
            set_no_domain_alert();
        }
        else {
            set_selected_domain(response.domain);
        }


        if (null == response.trail || undefined == response.trail) {
            set_no_trail_alert();
        }
        else {
            set_selected_trail(response.trail);
        }

    });
    getDomainList();


    var tracking = chrome.extension.getBackgroundPage().dwState.tracking;
    console.log("Tracking: " + tracking);
    if (tracking) {
        $("#recording_on_label").addClass("active");
        $("#recording_off_label").removeClass("active");
    }
    else {
        $("#recording_off_label").addClass("active");
        $("#recording_on_label").removeClass("active");
    }

    $("#recording_on_label").click(function () {
        setTracking(true);
    });
    $("#recording_off_label").click(function () {
        setTracking(false);
    });
}


/**
 * Use google auth to authenticate a user and establish a session with the datawake server
 */
window.onload = function () {

    var signincallback = function (userInfo) {
        googlePlusUserLoader.getAuthToken(function (token) {
            console.log("I HAVE AN AUTH TOKEN. Ready to start a server session " + token);
            $.ajax({
                type: 'POST',
                url: chrome.extension.getBackgroundPage().config.datawake_serviceUrl + "/session",
                data: JSON.stringify({token: token}),
                contentType: 'application/json',
                dataType: 'json',
                success: function (user) {
                    console.log("datawake-plugin-server session established: " + user);
                    $("#org_label").text(user.org);
                    onLoggedIn();
                },
                error: function (e) {
                    console.log(e);
                }
            });
        });
    };
    googlePlusUserLoader.onload(signincallback);


    revoke_button = document.querySelector('#revoke');
    revoke_button.addEventListener('click', function () {
        $.ajax({
            type: 'DELETE',
            dataType: 'json',
            url: chrome.extension.getBackgroundPage().config.datawake_serviceUrl + "/session",
            success: function (response) {
                console.log("datawake server logout: " + response.session)
            },
            error: function (e) {
                console.log(e)
            }
        });
    });
};


// set on off buttons
function setTracking(tracking) {
    console.log("set tracking: " + tracking);
    if (tracking) {
        chrome.runtime.sendMessage({operation: "tracking-on"}, function (response) {
            console.log("tracking on.");
        });
    }
    else {
        chrome.runtime.sendMessage({operation: "tracking-off"}, function (response) {
            console.log("tracking off..");
        });
    }
}


// Display alert that no trail is selected
function set_no_trail_alert() {
    $("#alert_selected").attr("style", "display: none");
    $("#selected_trail").text("");
    $("#alert_none").attr("style", "display: block");
}

function set_no_domain_alert() {
    $("#alert_no_domain").attr("style", "display: block");
}


// Set the selected trail, updates the UI and Backgroud.js
function set_selected_trail(trailname) {
    chrome.runtime.sendMessage({operation: "set-trail", name: trailname}, function (response) {
        if (response == "ok") {
            $("#alert_failed").attr("style", "display: none");
            $("#alert_none").attr("style", "display: none");
            $("#alert_not_changed").attr("style", "display: none");
            $("#selected_trail").text(trailname);
            $("#selected_trail_warn").text(trailname);
            $("#alert_selected").attr("style", "display: block");
        }
        if (!trailname)
            set_no_trail_alert();
    });

}

// Set the selected domain, updates the UI and Backgroud.js
function set_selected_domain(domain) {
    chrome.runtime.sendMessage({operation: "set-domain", name: domain}, function (response) {
        if (response == "ok") {
            $("#domain_label").text(domain);
            $("#alert_no_domain").attr("style", "display: none")
        }
    });
    getTrailList(domain);
    set_selected_trail(undefined);

}


function set_matching_trails(trails) {
    $("#search_results").attr("style", "display: block;");
    d3.select("#search_results_inner_table").selectAll("tr").remove();

    var rows = d3.select("#search_results_inner_table").selectAll("tr")
        .data(trails).enter().append("tr");

    rows.append("td").append("a")
        .text(function (d) {
            return d.name
        })
        .attr("title", function (d) {
            return d.description
        })
        .on("click", function (d) {
            set_selected_trail(d.name)
        });

    rows.append("td").text(function (d) {
        var d = new Date(parseInt(d.created) * 1000);
        return d.toDateString();
    })
}

function clear_matching_trails() {
    $("#search_results").attr("style", "display: none;");
    d3.select("#search_results_inner_table").selectAll("tr").remove();
}

function set_create_trail_option(trailname) {
    if (trailname && trailname != "") {
        $("#new_trail_name_cell").text(trailname);
        $("#create_new_trail").attr("style", "display: block;");
    }

}


/*
 Create a new Trail.
 */
function create_new_trail(trailname, description) {
    console.log("datawake - newTab.js creating new trail. name=" + trailname + " description=" + description);
    $("#alert_failed").attr("style", "display: none");
    $("#alert_processing").attr("style", "display: block");
    var url = chrome.extension.getBackgroundPage().config.datawake_serviceUrl + "/datawake_trails/createTrail";

    // use the background service to get the current user id
    chrome.runtime.sendMessage({operation: "get-poster-data"}, function (response) {
        console.log(response);
        var jsonData = JSON.stringify({
            'trailname': trailname,
            'traildescription': description,
            'domain': response.domain
        });
        $.ajax({
            type: "POST",
            url: url,
            data: jsonData,
            dataType: 'json',
            contentType: 'application/json',
            success: function (response) {
                console.log("Successfully added trail? - " + response.success);
                $("#alert_processing").attr("style", "display: none");
                set_selected_trail(trailname);

                var options = d3.select("#trail_select");
                options.append("option")
                    .attr("value", trailname)
                    .text(trailname);
                $("#trail_select").trigger("chosen:updated");

            },
            error: function (jqxhr, textStatus, reason) {
                $("#alert_processing").attr("style", "display: none");
                $("#alert_failed").attr("style", "display: block");
                console.log("Create Trail Error " + textStatus + " " + reason);
            }
        })
    })
}
$(function () {
    $("#new_trail_create_btn").click(function () {
        var name = $("#new_trail_name").val();
        var description = $("#new_trail_description").val();
        create_new_trail(name, description);
    });
    $("#new_trail_name").keypress(function (event) {
        if (event.keyCode == 13) {
            var name = $("#new_trail_name").val();
            var description = $("#new_trail_description").val();
            create_new_trail(name, description)
        }
    });
    $("#new_trail_description").keypress(function (event) {
        if (event.keyCode == 13) {
            var name = $("#new_trail_name").val();
            var description = $("#new_trail_description").val();
            create_new_trail(name, description);
        }
    });

});


/*
 get the list of all trails
 */
function getTrailList(domain) {
    $.ajax({
        type: "POST",
        url: chrome.extension.getBackgroundPage().config.datawake_serviceUrl + "/datawake_trails/trails",
        dataType: 'json',
        contentType: 'application/json',
        data: JSON.stringify({domain: domain}),
        success: function (response) {
            console.log("got trails: " + response.trails.length);
            var trails = response.trails;

            console.log(trails);
            d3.select("#trail_select").selectAll("option").remove();
            var options = d3.select("#trail_select").selectAll("option");
            options.append("option")
                .attr("value", "")
                .text("");


            options = options.data(trails).enter();

            options.append("option")
                .attr("value", function (d) {
                    return d.name;
                })
                .text(function (d) {
                    return d.name;
                });

            $("#trail_select").trigger("chosen:updated");

        },
        error: function (jqxhr, textStatus, reason) {
            console.log("getTrailList error " + textStatus + " " + reason);
        }

    })
}


/*
 get the list of all domains
 */
function getDomainList() {
    $.ajax({
        type: "GET",
        url: chrome.extension.getBackgroundPage().config.datawake_serviceUrl + "/domains",
        dataType: 'json',
        success: function (domains) {
            console.log("got domains: " + domains.length);
            var options = d3.select("#domain_select").selectAll("option");
            options.remove();
            options.append("option")
                .attr("value", "")
                .text("");


            options = options.data(domains).enter();

            options.append("option")
                .attr("value", function (d) {
                    return d.name;
                })
                .text(function (d) {
                    return d.name;
                });

            $("#domain_select").trigger("chosen:updated");

        },
        error: function (jqxhr, textStatus, reason) {
            console.log("getDomainList error " + textStatus + " " + reason);
        }

    })
}

