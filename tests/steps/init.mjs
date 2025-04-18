import { config } from "dotenv";

process.env.AWS_REGION = "us-east-1";

export default function setup() {
  config();
}
