import express from "express";
import bodyparser from "body-parser";
import cors from "cors";
import axios from "axios";

const app = express();
app.use(bodyparser.json());
app.use(cors());

const posts = {};

app.get("/posts", (req, res) => {
  res.send(posts);
});

function handleEvent(type, data) {
  if (type === "PostCreated") {
    const { id, title } = data;
    if (!posts[id]) {
      posts[id] = { id, title, comments: [] };
    }
  }

  if (type === "CommentCreated") {
    const { id, content, postId, status } = data;
    const post = posts[postId];

    if (!post) {
      return;
    }

    if (!post.comments.find((comment) => comment.id === id)) {
      post.comments.push({ id, content, status });
    }
  }

  if (type === "CommentUpdated") {
    const { id, content, postId, status } = data;
    const post = posts[postId];
    const comment = post.comments.find((comment) => {
      return comment.id === id;
    });
    if (!comment || comment.status === "approved") {
      return;
    }
    comment.status = status;
    comment.content = content;
  }
}

app.post("/events", (req, res) => {
  console.log("Received event", req.body.type);
  handleEvent(req.body.type, req.body.data);
  res.send({});
});

app.listen(4002, async () => {
  console.log("Listening on 4002");
  const res = await axios.get("http://localhost:4005/events", {
    type: "EventBusStarted",
    data: {},
  });
  for (let { event } of res.data) {
    handleEvent(event.type, event.data);
  }
});
