class QueueService:
    def estimate(self, people_ahead, average_minutes=12):
        if people_ahead is None:
            return None
        return max(0, int(people_ahead)) * average_minutes