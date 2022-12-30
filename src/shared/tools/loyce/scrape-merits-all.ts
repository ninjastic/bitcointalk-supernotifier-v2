import axios from 'axios';

(async () => {
  const { data } = await axios.get('https://loyce.club/Merit/merit.all.txt');
  const entries = data.split('\n');
  entries.pop();
  const merits = entries.map(entry => {
    const [timestamp, amount, topicAndPost, sender_uid, receiver_uid] =
      entry.split('\t');
    const topic_id = topicAndPost.match(/(\d+)\./)[1];
    const post_id = topicAndPost.match(/\.msg(\d+)/)[1];
    return {
      timestamp: Number(timestamp),
      amount: Number(amount),
      topic_id: Number(topic_id),
      post_id: Number(post_id),
      sender_uid: Number(sender_uid),
      receiver_uid: Number(receiver_uid),
    };
  });
})();
