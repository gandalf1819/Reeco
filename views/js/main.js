var outputArea = $("#chat-output");

$("#user-input-form").on("submit", function (e) {
  message = $(".user-input").val();
  console.log("User input : ", message)
  e.preventDefault();

  // Call AWS SDK using apigClient.js
  var apigClient = apigClientFactory.newClient();

  var params = {};

  lastUserMessage = userMessage();
  console.log("Last User Message : ", lastUserMessage)

  var body = {
    "userId": "12345",
    "message": lastUserMessage
  };

  var additionalParams = {};

  apigClient.chatbotPost(params, body, additionalParams)
    .then(function (result) {
		reply = result.data.message.message;
		console.log("result ======", reply)

		outputArea.append(`
			<div class='bot-message'>
		        <div class='message'>
				${reply}
				</div>
			</div>
    	`);

		$(".user-input").val(null);
		botMessage = result.data.message.message;
		console.log("Bot Message: "+ botMessage);
		resolve(botMessage);

    }).catch(function (result) {
	  // Add error callback code here
	  	console.log("Error : ", result);
		botMessage = "Couldn't establish connection to API Gateway"
		reject(result);
    });

	function userMessage() {

		// Get user input from front-end
		message = $(".user-input").val();
		console.log("User input : ", message)
	
		$(message).appendTo($('.user-message'));
		$(".user-input").val(null);

		outputArea.append(`
			<div class='user-message'>
				<div class='message'>
				${message}
				</div>
			</div>
    	`);
	
		return message;
	};
});