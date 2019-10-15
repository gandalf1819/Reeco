# Reeco

Reeco is a  Dining Concierge chatbot, that sends you restaurant suggestions given a set of preferences that you provide the chatbot withthrough conversation.

##  Command to package and deploy SAM templates
- sam package --s3-bucket cc-chatbot-niknar
- sam deploy --template-file template.yml --capabilities CAPABILITY_IAM --stack-name chatbot

The following code will take the template defined in template.yml and take the codeURI fields for the lambda functions, and creates an artifact and automatically
uploads it to the S3 bucket. The artifact ID will then be put into the file and a new file with this ID is created as output-template.yml
- sam package --template-file template.yml --s3-bucket cc-chatbot-niknar --output-template-file output-template.yml

Run this to deploy after the previous command: (Note that you need to deploy the output-template and not the template)
sam deploy --template-file output-template.yml --stack-name chatbot --capabilities CAPABILITY_IAM

Command to delete the entire stack:
- sam delete-stack --stack-name chatbot

## Architecture

![Reeco Architecture](https://github.com/NikhilNar/Chatbot/blob/master/views/images/architecture.png)

## Bot Conversation

![Reeco Conversation](https://github.com/NikhilNar/Chatbot/blob/master/views/images/conversation.png)

## Team

* [Nikhil Nar](https://github.com/NikhilNar)
* [Suraj Gaikwad](https://github.com/surajgovardhangaikwad)
* [Chinmay Wyawahare](https://github.com/gandalf1819)
* [Vineet Viswakumar](https://github.com/vineet247)
