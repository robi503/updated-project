import React, { useCallback, useContext, useEffect, useState } from 'react';
import { RouteComponentProps } from 'react-router';
import { IonButton, IonContent, IonHeader, IonInput, IonLoading, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { AuthContext } from './AuthProvider';
import { getLogger } from '../core';
import { useNetwork } from '../net/useNetwork';

const log = getLogger('Login');

interface LoginState {
  username?: string;
  password?: string;
}

export const Login: React.FC<RouteComponentProps> = ({ history }) => {
  const { isAuthenticated, isAuthenticating, login, authenticationError } = useContext(AuthContext);
  const [state, setState] = useState<LoginState>({});
  const { networkStatus } = useNetwork();
  const { username, password } = state;
  const handlePasswwordChange = useCallback((e: any) => setState({
    ...state,
    password: e.detail.value || ''
  }), [state]);
  const handleUsernameChange = useCallback((e: any) => setState({
    ...state,
    username: e.detail.value || ''
  }), [state]);
  const handleLogin = useCallback(() => {
    if (!networkStatus.connected) {
      log('Login attempt without network');
      return;
    }
    log('handleLogin...');
    login?.(username, password);
  }, [username, password]);
  const handleCreateAccount = () => {
    history.push('/signup');
  };
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
          <IonTitle>Login</IonTitle>
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
          <div>{authenticationError.message || 'Failed to authenticate'}</div>
        )}
         <IonButton onClick={handleLogin} disabled={!networkStatus.connected}>Login</IonButton>
        <IonButton onClick={handleCreateAccount} disabled={!networkStatus.connected}>Create Account</IonButton>
        {!networkStatus.connected && <div>No network connection</div>}
      </IonContent>
    </IonPage>
  );
};
