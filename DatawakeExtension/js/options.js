

window.onload = function() {

    // define a call back to set option values on UI
    var optionsCallback = function(options){
        $("#service_url").val(options.datawake_serviceUrl);
        $("#image_service_url").val(options.datawake_imageServiceUrl)
    };


    // set select options
    var deployments = Object.keys(dwConfig.deployments);
    d3.select("#deployment_select").selectAll("option").remove();
    d3.select("#deployment_select").selectAll("option")
        .data(deployments)
        .enter()
        .append("option")
        .attr("value",function(d){return d})
        .text(function(d){return d});


    // set the current settings
    dwConfig.getOptions(optionsCallback);


    // set select on change function
    $("#deployment_select").change(function(){
        var selected = $("#deployment_select").val();

        if (selected == ""){
            dwConfig.getOptions(optionsCallback);
        }
        else{
            console.log("options: "+selected);
            var options = dwConfig.deployments[selected];
            optionsCallback(options);
        }
    });

    // set save button action
    $("#save").click(function(){
        var options = {
            datawake_serviceUrl:  $("#service_url").val(),
            datawake_imageServiceUrl : $("#image_service_url").val()
        };
        dwConfig.saveOptions(options);
    })




};