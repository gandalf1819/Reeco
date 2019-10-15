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

## Steps to add data in AWS DynamoDB and ElasticSearch Service

1. Fetch the restaurants data from Yelp APIs for a variety of cuisines.
2. Create a JSON object for each rows using the field values of the Yelp data and start inserting row-wise data in AWS DynamoDB.
3. While dumping the data into AWS DynamoDB, create a mapping at ElasticSearch for cuisines and restaurants. Each cuisine will store a list of restaurant IDs which serve the cuisine at their restaurants. 
4. When the user asks for restaurant suggestions for a given cuisines, restaurant will be searched in the ElasticSearch mapping for the cuisine requested. Once we fetch the restaurant ID from ElasticSearch, we will fetch the data associated to the restaurant ID from DynamoDB.

Command to dump the data on AWS DynamoDB and ElasticSearch service:

$ python yelp-dynamo-els.py

## Architecture

![Reeco Architecture](https://github.com/NikhilNar/Chatbot/blob/master/views/images/architecture.png)

## Bot Conversation

![Reeco Conversation](https://github.com/NikhilNar/Chatbot/blob/master/views/images/conversation.png)

## Team

* [Nikhil Nar](https://github.com/NikhilNar)
* [Suraj Gaikwad](https://github.com/surajgovardhangaikwad)
* [Chinmay Wyawahare](https://github.com/gandalf1819)
* [Vineet Viswakumar](https://github.com/vineet247)
