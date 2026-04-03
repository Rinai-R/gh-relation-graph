import { GraphProvider } from './context/GraphContext';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/Layout';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <GraphProvider>
        <Layout />
      </GraphProvider>
    </AuthProvider>
  );
}

export default App;
