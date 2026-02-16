from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
import json
from .models import GameScore, Profile

def index(request):
    return render(request, 'main/index.html')

@login_required(login_url='login')
def profile(request):
    profile_obj, created = Profile.objects.get_or_create(user=request.user)
    if created:
        profile_obj.update_total_score()
    
    # Get recent game scores (last 10 games)
    recent_games = GameScore.objects.filter(user=request.user)[:10]
    
    # Get statistics
    total_games = GameScore.objects.filter(user=request.user).count()
    games_won = GameScore.objects.filter(user=request.user, won=True).count()
    games_lost = total_games - games_won

    # Leaderboard: top 10 players by score
    leaderboard = Profile.objects.select_related("user").order_by("-score", "user__username")[:10]
    
    context = {
        'profile': profile_obj,
        'recent_games': recent_games,
        'total_games': total_games,
        'games_won': games_won,
        'games_lost': games_lost,
        'leaderboard': leaderboard,
    }
    return render(request, 'main/profile.html', context)

@login_required(login_url='login')
def game(request):
    # Get user's total score if authenticated
    user_score = 0
    if request.user.is_authenticated:
        profile_obj, created = Profile.objects.get_or_create(user=request.user)
        if created:
            profile_obj.update_total_score()
        user_score = profile_obj.score
    
    context = {
        'user_score': user_score,
    }
    return render(request, 'main/game.html', context)

@require_http_methods(["POST"])
@login_required(login_url='login')
def save_score(request):
    try:
        data = json.loads(request.body)
        word = data.get('word', '').upper()
        attempts = data.get('attempts', 0)
        points = data.get('points', 0)
        won = data.get('won', False)
        
        # Validate data
        if not word or len(word) != 5 or attempts < 1 or attempts > 5:
            return JsonResponse({'success': False, 'error': 'Invalid data'}, status=400)
        
        # Create game score
        game_score = GameScore.objects.create(
            user=request.user,
            word=word,
            attempts=attempts,
            points=points,
            won=won
        )
        
        # Update user's profile total score
        profile, created = Profile.objects.get_or_create(user=request.user)
        profile.update_total_score()
        
        return JsonResponse({
            'success': True,
            'message': 'Score saved successfully',
            'total_score': profile.score
        })
        
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)