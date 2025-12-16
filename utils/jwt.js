import fs from "node:fs";
import path from "node:path";
import jwt from "jsonwebtoken";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// membaca key dari private-key.pem
const PRIVATE_KEY = fs.readFileSync(
    path.join(__dirname, "../private-key.pem"),
    "utf8"
);

const PUBLIC_KEY = fs.readFileSync(
    path.join(__dirname, "../certificate.pem"),
    "utf8"
);

// sign JWT pas login
export function signToken(payload) {
    return jwt.sign(payload, PRIVATE_KEY, {
        algorithm: "RS256",
        expiresIn: "1h"
    });
}

// memverifikasi JWT setiap request
export function verifyToken(token) {
    return jwt.verify(token, PUBLIC_KEY, {
        algorithms: ["RS256"]
    });
}