self.on("click", function(node, contextItemDataProperty) {
  var messageWrapper = {};
  if (contextItemDataProperty == "add-entity" || contextItemDataProperty == "add-irrelevant-entity" || contextItemDataProperty == "add-entity-custom" || contextItemDataProperty == "add-irrelevant-entity-custom") {

    messageWrapper.text = window.getSelection().toString();
  }
  messageWrapper.intent = contextItemDataProperty;
  self.postMessage(messageWrapper);
});