'use strict';

var AWS = require('aws-sdk')

exports.handler = (event, context, callback) => {

    let message = JSON.parse(event.body).message,
        userId = JSON.parse(event.body).userId,
        responseBody = {
            statusCode: 200
        }

    let lexRunTime = new AWS.LexRuntime();
    let params = {
        botAlias: 'reeco',
        botName: 'Reeco',
        inputText: message,
        userId: userId
    }

    let promise = new Promise((resolve, reject) => {
        lexRunTime.postText(params, function (err, data) {
            if (err) {
                console.log("err =", err)
                responseBody.statusCode = 500
                responseBody.message = "Did not get a response from Lex"
                resolve(responseBody)
            }
            console.log("message received from Lex =", data)
            responseBody.message = data
            resolve(responseBody)
        })
    })

    promise.then((responseBody) => {
        callback(null, {
            body: JSON.stringify(responseBody)
        })
    })
};