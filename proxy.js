import https from "node:https";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

// https certificate
const privateKeyPath = path.resolve(import.meta.dirname, "private-key.pem");
const certificatePath = path.resolve(import.meta.dirname, "certificate.pem");
const privateKey = fs.readFileSync(privateKeyPath);
const certificate = fs.readFileSync(certificatePath);
const proxy = new https.Server({
   key: privateKey,
   cert: certificate,
})

const hostname = "127.0.0.1";
const port = 3000;

proxy.on("request", (request, response) => {
    const method = request.method;
    const path = request.url;

    const server = http.request({
        host: hostname,
        port: port,
        method: method,
        path: path,
        headers: request.headers,
    });
    request.pipe(server);

    server.on("response", (serverResponse) => {
    response.writeHead(
        serverResponse.statusCode,
        serverResponse.headers
    );
    serverResponse.pipe(response);
});
});

proxy.listen(8080);
console.log('The proxy is running! Check it on https://localhost:8080/');