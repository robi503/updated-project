import React, { useCallback, useContext, useEffect, useState } from 'react';
import { RouteComponentProps } from 'react-router';
import { IonButton, IonContent, IonHeader, IonInput, IonLoading, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { AuthContext } from './AuthProvider';
import { getLogger } from '../core';
import { signup } from './authApi';


const log = getLogger('Create account');

interface SignupState {
  username?: string;
  password?: string;
}

export const Signup: React.FC<RouteComponentProps> = ({ history }) => {
  const { isAuthenticated, isAuthenticating, authenticationError } = useContext(AuthContext);
  const [state, setState] = useState<SignupState>({});
  const { username, password } = state;
  const handlePasswwordChange = useCallback((e: any) => setState({
    ...state,
    password: e.detail.value || ''
  }), [state]);
  const handleUsernameChange = useCallback((e: any) => setState({
    ...state,
    username: e.detail.value || ''
  }), [state]);
  const handleSignup = useCallback(async () => {
    log('handleSignup...');
    try {
      const response = await signup(username, password);
      log('Signup successful', response);
      // Handle post-signup logic here (e.g., redirect to login or auto-login)
    } catch (error) {
      log('Signup failed', error);
      // Handle signup error here
    }
  }, [username, password]);
  log('render');
  useEffect(() => {
    if (isAuthenticated) {
      log('redirecting to home');
      history.push('/');
    }
  }, [isAuthenticated]);
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Create account</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonInput
          placeholder="Username"
          value={username}
          onIonChange={handleUsernameChange}/>
        <IonInput
          placeholder="Password"
          value={password}
          onIonChange={handlePasswwordChange}/>
        <IonLoading isOpen={isAuthenticating}/>
        {authenticationError && (
          <div>{authenticationError.message || 'Failed to create account'}</div>
        )}
        <IonButton onClick={handleSignup}>Create account</IonButton>
      </IonContent>
    </IonPage>
  );
};
