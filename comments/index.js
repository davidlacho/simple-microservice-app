import express from "express";
import bodyParser from "body-parser";
import { randomBytes } from "crypto";
import cors from "cors";
import axios from "axios";

const app = express();
app.use(bodyParser.json());
app.use(cors());

const commentsByPostId = {};

app.get("/comments", (req, res) => {
  res.send(commentsByPostId);
});

app.get("/posts/:id/comments", (req, res) => {
  res.send(commentsByPostId[req.params.id] || []);
});

app.post("/posts/:id/comments", (req, res) => {
  const commentId = randomBytes(4).toString("hex");
  const { content } = req.body;

  if (!content) {
    return res.status(400).send("Comment cannot be empty");
  } 

  const comments = commentsByPostId[req.params.id] || [];
  comments.push({ id: commentId, content, status: "pending" });
  commentsByPostId[req.params.id] = comments;

  axios.post("http://localhost:4005/events", {
    type: "CommentCreated",
    data: {
      id: commentId,
      content,
      status: "pending",
      postId: req.params.id,
    },
  });

  app.post("/events", (req, res) => {
    const event = req.body;
    console.log("Received event", event.type);

    if (event.type === "CommentModerated") {
      const { postId, id, status, content } = event.data;

      const comments = commentsByPostId[postId];

      const comment = comments.find((comment) => {
        return comment.id === id;
      });

      comment.status = status;

      axios.post("http://localhost:4005/events", {
        type: "CommentUpdated",
        data: {
          id,
          status,
          postId,
          content,
        },
      });
    }

    res.send({});
  });

  res.status(201).send(comments);
});

app.listen(4001, () => {
  console.log(`Listening on port 4001`);
});
