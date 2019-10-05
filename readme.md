Command to package and deploy SAM templates
- sam package --s3-bucket cc-chatbot-niknar
- sam deploy --template-file template.yml --capabilities CAPABILITY_IAM --stack-name chatbot

The following code will take the template defined in template.yml and take the codeURI fields for the lambda functions, and creates an artifact and automatically
uploads it to the S3 bucket. The artifact ID will then be put into the file and a new file with this ID is created as output-template.yml
- aws cloudformation package --template-file template.yml --s3-bucket cc-chatbot-niknar --output-template-file output-template.yml

Run this to deploy after the previous command: (Note that you need to deploy the output-template and not the template)
aws cloudformation deploy --template-file output-template.yml --stack-name cc-chatbot-niknar --capabilities CAPABILITY_IAM

Command to delete the entire stack:
- aws cloudformation delete-stack --stack-name chatbot