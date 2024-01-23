import React, { useCallback, useContext, useEffect, useState } from 'react';
import { RouteComponentProps } from 'react-router';
import { IonButton, IonContent, IonHeader, IonInput, IonLoading, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { AuthContext } from './AuthProvider';
import { getLogger } from '../core';
import { signup } from './authApi';
import { useNetwork } from '../net/useNetwork';


const log = getLogger('Create account');

interface SignupState {
  username?: string;
  password?: string;
  signupError?: string;
}

export const Signup: React.FC<RouteComponentProps> = ({ history }) => {
  const { isAuthenticated, isAuthenticating, authenticationError } = useContext(AuthContext);
  const [state, setState] = useState<SignupState>({});
  const { networkStatus } = useNetwork();
  const { username, password, signupError } = state;
  const handlePasswwordChange = useCallback((e: any) => setState({
    ...state,
    password: e.detail.value || ''
  }), [state]);
  const handleUsernameChange = useCallback((e: any) => setState({
    ...state,
    username: e.detail.value || ''
  }), [state]);
  const handleSignup = useCallback(async () => {
    if (!networkStatus.connected) {
      log('Signup attempt without network');
      setState(prevState => ({ ...prevState, signupError: 'Signup attempt without network' }));
      return;
    }
    log('handleSignup...');
    try {
      const response = await signup(username, password);
      log('Signup successful', response);
      log('redirecting to home');
      history.push('/');
    } catch (error) {
      log('Signup failed', error);
      if (typeof error === 'object' && error !== null && 'response' in error) {
        const typedError = error as { response: { status: number, data?: any } };
        if (typedError.response.status === 409) {
          setState(prevState => ({ ...prevState, signupError: 'Username is already taken' }));
        } else {
          setState(prevState => ({ ...prevState, signupError: 'Failed to create account' }));
        }
      } else {
        setState(prevState => ({ ...prevState, signupError: 'Unknown error' }));
      }
    }
  }, [username, password, networkStatus.connected]);
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
        <IonButton onClick={handleSignup} disabled={!networkStatus.connected}>Create account</IonButton>
        {!networkStatus.connected && <div>No network connection</div>}
        {signupError && (<div>{signupError}</div>)}
      </IonContent>
    </IonPage>
  );
};
