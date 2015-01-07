self.on("click", function (node, contextItemDataProperty) {
    var messageWrapper = {};
    if (contextItemDataProperty == "selection"
        || contextItemDataProperty == "feedback"
        || contextItemDataProperty == "add-trail-entity"
        || contextItemDataProperty == "add-irrelevant-trail-entity"
        || contextItemDataProperty == "add-trail-entity-custom"
        || contextItemDataProperty == "add-irrelevant-trail-entity-custom") {

        messageWrapper.text = window.getSelection().toString();
    }
    messageWrapper.intent = contextItemDataProperty;
    self.postMessage(messageWrapper);
});
