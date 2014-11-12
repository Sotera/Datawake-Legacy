

//build table from array
function buildTable(links) {
    console.log("building table = " + links);
    var content = "<table id='dw-link-table'>";
    //content += "<tr> <th> # </th> <th>Live Link</th> <th>Google Cache</th> </tr>"
    for(var i=0; i < links['image_urls'].length; i++) {
        if (links['image_urls'][i] != null && links['image_urls'][i] != "null") {
            //var urlWithoutProtocol = links[i].replace(/.*?:\/\//g, '');
            //console.log("url without protocol = " + urlWithoutProtocol);
            //note the http hack
            content += '<tr>' +
                        '<td>' + (i+1) + '</td>' +
                        '<td>' + '<a id=' + 'dw-live-' + i + ' href="http://' + links['image_urls'][i] + '"  target="_blank" >' + 'Live Image Link' + '</a></td>' +
                        '<td> <a id=' + 'dw-cache-' + i + ' href="' + links['cached_image_urls'][i] + '"  target="_blank" >' + 'Cached Image link' + '</a> </td>' +
                        '<td> <a id=' + 'dw-live-page-' + i + ' href="http://' + links['page_urls'][i] + '"  target="_blank" >' + 'Live Page' + '</a> </td>' +
                        '<td> <a id=' + 'dw-cache-page-' + i + ' href="' + links['cached_page_urls'][i] + '" target= "_blank">' + 'Cache Page' + '</a> </td>' +
                        '</tr>';
        }
    }
    content += "</table>";
    return content;
}


function retrieveLinks(imgObj, targetId, imageUrl, returnCount, usePreviews) {
    chrome.runtime.sendMessage({operation: "get-image-service"}, function (response) {
        doRetrieveLinks(imgObj, targetId, imageUrl, returnCount, usePreviews,response.service)
    })
}


//example request
function doRetrieveLinks(imgObj, targetId, imageUrl, returnCount, usePreviews,service) {

    var disableImageService = $("body").data("bDisableImageService");
    if (disableImageService == null || disableImageService == true) {
        return;
    }


    console.log("retrieving image service using url " + service);
    //remove protocol from image url
    imageUrl = imageUrl.replace(/.*?:\/\//g, '');
    var params = 'url=' + imageUrl + '&num=' + returnCount;
    var url = "?" + service + encodeURIComponent(params);
    console.log("calling service = " + url)
    $.ajax({url:service,
        type: 'GET',
        data: {
            url : imageUrl,
            num : returnCount
        },
        success:function(result) {
            console.log("received result = " + result);
            var resultArray = JSON.parse(result);

            //console.log(resultArray);
            //quick check for results
            var bHasValues = false;
            //console.log("image urls = ");
            //console.log( resultArray['image_urls']);
            for (var i=0; i < resultArray['image_urls'].length; i++) {
                if (resultArray['image_urls'][i] != null && resultArray['image_urls'][i] != "null") {
                    bHasValues = true;
                    break;
                }
            }
            var dialogContent =  "";
            if (bHasValues == true) {
                dialogContent = buildImageLinkDialog(resultArray);
            }
            else {
                dialogContent = '<p><font face="Georgia" size="4">Unable to Find Related Links</font></p>';
            }
            //console.log("dialog content = " + dialogContent);

            if (usePreviews == true) {
                $(targetId).html('<div style="height: 100px;" class="urlive-container">');
                $(targetId).append(dialogContent);
                //$(targetId).html(dialogContent);
                var ahrefs = $('table#dw-link-table a');
                console.log("ahrefs length = " + ahrefs.length);

                //console.log(ahrefs);
                for (var i=0; i < ahrefs.length; i++) {
                    //$('table#dw-link-table a').urlive({

                    $(ahrefs[i]).hover(function () {
                        //$(".urllive-container").urllive("remove");
//                        console.log("this ahref");
//                        console.log($(this).attr('id'))
                        $(".urlive-container").html('');
                        $('#' + $(this).attr('id')).urlive({
                             imageSize: 'small',
                             onFail: function() {
                                $('.urlive-container').text('Image Preview Unavailable');
                             },
                             imgError:  function() {
                               $('.urlive-container').text('Image Preview Unavailable');
                             },
                             imgError:  function() {
                                $('.urlive-container').text('Image Preview Unavailable');
                             },
                             onSuccess: function(data) {
                                console.log("urlive onSuccess = ")
                                console.log(data);
                                if (data.image == null) {
                                    $('.urlive-container').text('Image Preview Unavailable');
                                }
                             }
                        });
                        $('#' + $(this).attr('id')).urlive("open");
                    });

                }
            }
            else {
                $(targetId).html(dialogContent);
            }
            //var imageLinkCount = returnCount;
            var imageLinkCount = 0;
            if (resultArray['image_urls'] != null) {
                for (var i=0; i < resultArray['image_urls'].length; i++) {
                    if (resultArray['image_urls'][i] != null && resultArray['image_urls'][i] != "null") {
                        imageLinkCount += 1;
                    }
                }
            }

            var siblingElements = $(imgObj).siblings('h2');
            if (siblingElements != null && siblingElements.length > 0) {
                console.log($(siblingElements))
                $(siblingElements).html('<span>Related Pages: ' + imageLinkCount + ' <span class="spacer"></span><br />');
            }

        },
        error:function() {
            $(targetId).html('<p><font face="Georgia" size="4">Error Loading Links</font></p>');
        }
    });

}



function initializeImageTextBlocks() {
    var images = $('img')
    for (var i=0; i < images.length; i++) {
        var imageDivId = "dw-img-id-" + i;
        $(images[i]).wrap('<div id=' + imageDivId + ' class="image"> <h2></h2> </div>');
    }
}



function buildImageLinkDialog(links) {
    var html = '<p><font face="Georgia" size="4">';
    html += buildTable(links);
    //html += "</font></p></div>";
    html += "</font></p>";
    return html;
}

function setupImageService(bUseImageService) {
    //remove popup dialog
    console.log("setup image service " + bUseImageService);

    if (bUseImageService == true) {
        $("body").append('<div id=dw-dialog Title="Related Page Images">' +
                          '<p><font face="Georgia" size="4">Loading Links...</font></p></div>');
        $("#dw-dialog").dialog({ autoOpen: false });
        $("img").mouseover(function() {
            if (!SERVICE_ON) return;

            console.log($(this));
            console.log('using source url = ' + $(this).attr("src"));

            var imageUrl = $(this).attr("src");
            $(this).html('<p><font face="Georgia" size="4">Loading Links...</font></p>');
            $("#dw-dialog").dialog("open");

            //production
            retrieveLinks(this, "#dw-dialog", imageUrl, 5, true);

        });
        $("body").data("bDisableImageService", false);
    }
    else {
        $("#dw-dialog").remove();
        $("img").mouseover(function() {})

        $("body").data("bDisableImageService", true);
    }

}

SERVICE_ON = false
INITIALIZED = false

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse){
    if(request.operation == "enable-image-service"){
        SERVICE_ON = !SERVICE_ON
        if (!INITIALIZED){
            INITIALIZED = true
            initializeImageTextBlocks();
        }

        if (SERVICE_ON){
            alert("Image service is on.  Hoover over an image to find similar images. Refresh the page or select Image Service again to turn this feature off.")
        }


        setupImageService(SERVICE_ON);
        sendResponse({success: true});
    }
});