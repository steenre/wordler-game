from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from .forms import CreateUser, LoginForm
from django.contrib import messages
from django.contrib.auth.models import User

def signin(request):
    if request.user.is_authenticated:
        messages.error(request, 'You cannot be here! You are logged in')
        return redirect('products')
    
    form = LoginForm()
    if request.method == 'POST':
        form = LoginForm(request, data=request.POST)
        if form.is_valid():
            username = form.cleaned_data['username']
            password = form.cleaned_data['password']
    
            user = authenticate(request, username=username, password=password)
            
            if user is not None:
                login(request, user)
                messages.success(request, f"Login Successful, welcome {username}")
                return redirect('profile')
            else:
                form = LoginForm()
    
    context = {'form':form}
    return render(request, "auth/signin.html", context)

def signup(request):
    if request.user.is_authenticated:
        messages.error(request, 'You cannot be here! You are logged in')
        return redirect('products')
    form = CreateUser()
    if request.method == 'POST':
        form = CreateUser(request.POST)
        if form.is_valid():
            try:
                form.save()
                messages.success(request, "Account creation successful! Kindly login now")
                return redirect('login')
            except Exception as e:
                messages.error(request, f"Error: {e}")
        else:
            messages.error(request, "It appears something went wrong!")
    
    context = {'form':form}
    return render(request, "auth/signup.html", context)


def signout(request):
    logout(request)
    messages.success(request, "Logout Successful!")
    return redirect('login')