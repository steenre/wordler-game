from django.db import models
from django.contrib.auth.models import User

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    score = models.IntegerField(default=0)
    
    def __str__(self):
        return f"{self.user} - score: {self.score}"
    
    def update_total_score(self):
        """Update total score from all game scores"""
        total = GameScore.objects.filter(user=self.user).aggregate(
            total=models.Sum('points')
        )['total'] or 0
        self.score = total
        self.save()

class GameScore(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    word = models.CharField(max_length=5)
    attempts = models.IntegerField()
    points = models.IntegerField()
    won = models.BooleanField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.username} - {self.word} - {self.points}pts ({self.created_at.date()})"
