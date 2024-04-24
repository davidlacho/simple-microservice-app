import express from "express";
import bodyparser from "body-parser";
import axios from "axios";
import cors from "cors";

const app = express();
app.use(bodyparser.json());
app.use(cors());

const deadLetterQueue = [];
const eventBusDataCache = [];
const history = [];
const backoffTimes = {}; // Maintain backoff time for each service

app.post("/events", async (req, res) => {
  console.log("Received event", req.body);
  const event = req.body;

  // Add event to data cache
  eventBusDataCache.push(event);

  res.send({ status: "OK" });
});

app.get("/events", (req, res) => {
  res.send(history);
});

const services = [
  "http://localhost:4000/events",
  "http://localhost:4001/events",
  "http://localhost:4002/events",
  "http://localhost:4003/events",
];

services.forEach((service) => (backoffTimes[service] = 1000)); // Initialize backoff time for each service

async function processEvent(service, event) {
  try {
    await axios.post(service, event);
    backoffTimes[service] = 1000; // Reset backoff time on success
    history.push({ service, event, time: Date.now() });
  } catch (error) {
    deadLetterQueue.push({ service, event, time: Date.now() });
  }
}

setInterval(async () => {
  if (eventBusDataCache.length > 0) {
    const event = eventBusDataCache.shift();
    for (const service of services) {
      await processEvent(service, event);
    }
  }

  if (deadLetterQueue.length > 0) {
    const { service, event, time } = deadLetterQueue[0];
    const currentTime = Date.now();
    const backoffTime = backoffTimes[service];
    if (currentTime - time >= backoffTime) {
      try {
        await axios.post(service, event);
        console.log(
          `Successfully posted event from dead letter queue to ${service}`
        );
        deadLetterQueue.shift();
        backoffTimes[service] = 1000; // Reset backoff time on success
        history.push({ service, event, time: Date.now() });
      } catch (error) {
        backoffTimes[service] *= 1.1; // Increase backoff time by 10%
        console.error(
          `Failed to post event from dead letter queue to ${service}, will retry in ${backoffTimes[service]}ms`
        );
      }
    }
  }
}, 100);

app.listen(4005,  () => {
  console.log("Event bus listening on 4005");
});
