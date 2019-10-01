Command to package and deploy SAM templates
- sam package --s3-bucket cc-chatbot-niknar
- sam deploy --template-file template.yml --capabilities CAPABILITY_IAM --stack-name chatbot