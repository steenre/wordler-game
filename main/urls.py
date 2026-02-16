from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='landing'),
    path('profile/', views.profile, name='profile'),
    path('game/', views.game, name='game'),
    path('save-score/', views.save_score, name='save_score'),
]
