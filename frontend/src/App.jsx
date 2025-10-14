import { AppLayout, ContentLayout, Header } from '@cloudscape-design/components';
import '@cloudscape-design/global-styles/index.css';
import { MaskingForm } from './components/MaskingForm';

function App() {
  return (
    <AppLayout
      navigationHide
      toolsHide
      content={
        <ContentLayout
          header={
            <Header variant="h1">
              CloudMask GUI
            </Header>
          }
        >
          <MaskingForm />
        </ContentLayout>
      }
    />
  );
}

export default App;
