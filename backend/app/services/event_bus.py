import json

import redis


class EventBus:
    def __init__(self, url):
        self.client = redis.Redis.from_url(url, decode_responses=True, socket_connect_timeout=2, socket_timeout=2)

    def ping(self):
        return bool(self.client.ping())

    def publish(self, channel, event):
        self.client.publish(channel, json.dumps(event, separators=(",", ":")))

    def subscribe(self, channel):
        pubsub = self.client.pubsub(ignore_subscribe_messages=True)
        pubsub.subscribe(channel)
        return pubsub