import { Navigation } from './components/navigation';
import Home from './pages/home';

import HelloNear from './pages/hello_near';
import { BrowserRouter, Routes, Route } from "react-router";

import { PrivyProvider } from '@privy-io/react-auth';
import { NEARxPrivy } from './context/provider';

function App() {
  return (
    <PrivyProvider
      appId="cme1neps40007jy0b5hyesl0s"
      config={{
        "appearance": {
          "accentColor": "#6A6FF5",
          "theme": "#FFFFFF",
          "showWalletLoginFirst": false,
          "logo": "https://auth.privy.io/logos/privy-logo.png",
        },
        "loginMethods": [
          "email",
          "google",
          "github"
        ],
      }}
    >
      <NEARxPrivy>
        <BrowserRouter>
          <Navigation />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/hello-near" element={<HelloNear />} />
          </Routes>
        </BrowserRouter>
      </NEARxPrivy>
    </PrivyProvider>
  )
}

export default App
