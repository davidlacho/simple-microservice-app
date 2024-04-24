const commentStatuses = {
  approved: (comment) => <li key={comment.id}>{comment.content}</li>,
  rejected: (comment) => <li key={comment.id}>This comment has been rejected</li>,
  pending: (comment) => <li key={comment.id}>This comment is awaiting moderation</li>,
};

const CommentList = ({ comments }) => {
  const renderedComments = comments.map((comment) => {
    const renderComment = commentStatuses[comment.status] || commentStatuses.pending;
    return renderComment(comment);
  });

  return <ul>{renderedComments}</ul>;
};

export default CommentList;
