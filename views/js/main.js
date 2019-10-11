var outputArea = $("#chat-output");

$("#user-input-form").on("submit", function (e) {
  console.log("user input")
  e.preventDefault();

  var message = $("#user-input").val();

  outputArea.append(`
    <div class='bot-message'>
      <div class='message'>
        ${message}
      </div>
    </div>
  `);

  var apigClient = apigClientFactory.newClient();

  var params = {};

  var body = {
    "userId": "12345",
    "message": "Hello"
  };

  var additionalParams = {};

  apigClient.chatbotPost(params, body, additionalParams)
    .then(function (result) {
      console.log("result============", result)
      // Add success callback code here.
    }).catch(function (result) {
      console.log("error================", result)
      // Add error callback code here.
    });

  setTimeout(function () {
    outputArea.append(`
      <div class='user-message'>
        <div class='message'>
          I'm like 20 lines of JavaScript I can't actually talk to you.
        </div>
      </div>
    `);
  }, 250);

  $("#user-input").val("");

});