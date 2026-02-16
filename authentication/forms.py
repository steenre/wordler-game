from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from django.contrib.auth.models import User
from django import forms

class CreateUser(UserCreationForm):
    class Meta:
        model = User
        fields = ('username', 'first_name', 'last_name', 'email', 'password1', 'password2')
        labels = {
            'username': 'Username:',
            'first_name':'First Name',
            'last_name':'Last Name',
            'email':'Email',
            'passsword1': 'Password:',
            'password2': 'Confirm Password',
        }
        
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['username'].widget.attrs.update({'class':'form-control', 'placeholder': '@username'})
        self.fields['first_name'].widget.attrs.update({'class':'form-control', 'placeholder': 'like John'})
        self.fields['last_name'].widget.attrs.update({'class':'form-control', 'placeholder': 'like Doe'})
        self.fields['email'].widget.attrs.update({'class':'form-control', 'placeholder': 'example@email.com'})
        self.fields['password1'].widget.attrs.update({'class':'form-control', 'placeholder': 'Unique Password'})
        self.fields['password2'].widget.attrs.update({'class':'form-control', 'placeholder': 'Same as before'})
        

class LoginForm(AuthenticationForm):
    class Meta:
        fields = ('username', 'password')
        labels = {
            'username': 'Username:',
            'passsword': 'Password:',
        }
        
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['username'].widget.attrs.update({'class':'form-control', 'placeholder': '@username'})
        self.fields['password'].widget.attrs.update({'class':'form-control', 'title': 'if not, I cant help you', 'placeholder': 'Do you remember your Password'})
        