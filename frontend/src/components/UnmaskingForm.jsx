import { useState, useRef } from 'react';
import {
  Container,
  FormField,
  Textarea,
  Button,
  SpaceBetween,
  Flashbar,
  Header,
  Badge,
  ColumnLayout,
  Alert
} from '@cloudscape-design/components';
import axios from 'axios';
import { fileSave, fileOpen } from 'browser-fs-access';

export function UnmaskingForm() {
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [fileName, setFileName] = useState(null);
  const [mappingFile, setMappingFile] = useState(null);
  const fileInputRef = useRef(null);
  const mappingInputRef = useRef(null);

  async function handleUnmask() {
    if (!text.trim()) {
      setNotifications([{
        type: 'error',
        content: 'Please enter some text to unmask',
        dismissible: true,
        onDismiss: () => setNotifications([])
      }]);
      return;
    }

    if (!mappingFile) {
      setNotifications([{
        type: 'error',
        content: 'Please load a mapping file first',
        dismissible: true,
        onDismiss: () => setNotifications([])
      }]);
      return;
    }

    setLoading(true);
    setNotifications([]);
    try {
      const response = await axios.post('/api/unmask', {
        text: text,
        mapping: mappingFile
      });
      setResult(response.data);
      setNotifications([{
        type: 'success',
        content: `Unmasked ${response.data.items_unmasked} items in ${response.data.processing_time_ms.toFixed(1)}ms`,
        dismissible: true,
        onDismiss: () => setNotifications([])
      }]);
    } catch (err) {
      setNotifications([{
        type: 'error',
        content: err.response?.data?.detail || 'Unmasking failed',
        dismissible: true,
        onDismiss: () => setNotifications([])
      }]);
    } finally {
      setLoading(false);
    }
  }

  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      setNotifications([{
        type: 'error',
        content: 'File too large (max 50MB)',
        dismissible: true,
        onDismiss: () => setNotifications([])
      }]);
      return;
    }

    setFileName({ name: file.name, size: (file.size / 1024).toFixed(1) });
    const reader = new FileReader();
    reader.onload = (e) => setText(e.target.result);
    reader.readAsText(file);
  }

  async function handleMappingSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const mapping = JSON.parse(text);
      setMappingFile(mapping);
      setNotifications([{
        type: 'success',
        content: `Loaded mapping file: ${file.name}`,
        dismissible: true,
        onDismiss: () => setNotifications([])
      }]);
    } catch (err) {
      setNotifications([{
        type: 'error',
        content: 'Invalid mapping file format',
        dismissible: true,
        onDismiss: () => setNotifications([])
      }]);
    }
  }

  function handleClear() {
    setText('');
    setResult(null);
    setFileName(null);
    setMappingFile(null);
  }

  async function handleCopy() {
    if (!result?.unmasked_text) return;
    try {
      await navigator.clipboard.writeText(result.unmasked_text);
      setNotifications([{
        type: 'success',
        content: 'Copied to clipboard',
        dismissible: true,
        onDismiss: () => setNotifications([])
      }]);
    } catch (err) {
      setNotifications([{
        type: 'error',
        content: 'Failed to copy to clipboard',
        dismissible: true,
        onDismiss: () => setNotifications([])
      }]);
    }
  }

  async function handleSave() {
    if (!result?.unmasked_text) return;

    let outputFileName = 'unmasked-output.txt';
    let extension = '.txt';
    
    if (fileName?.name) {
      const match = fileName.name.match(/^(.+?)-masked(\.[^.]+)$/);
      if (match) {
        outputFileName = `${match[1]}-unmasked${match[2]}`;
        extension = match[2];
      } else {
        const match2 = fileName.name.match(/^(.+)(\.[^.]+)$/);
        if (match2) {
          outputFileName = `${match2[1]}-unmasked${match2[2]}`;
          extension = match2[2];
        } else {
          outputFileName = `${fileName.name}-unmasked.txt`;
        }
      }
    }

    const blob = new Blob([result.unmasked_text], { type: 'text/plain' });
    try {
      await fileSave(blob, {
        fileName: outputFileName,
        extensions: [extension]
      });
    } catch (err) {
      if (err.name !== 'AbortError') {
        setNotifications([{
          type: 'error',
          content: 'Failed to save file',
          dismissible: true,
          onDismiss: () => setNotifications([])
        }]);
      }
    }
  }

  const charCount = text.length;
  const lineCount = text.split('\n').length;

  return (
    <SpaceBetween size="l">
      <Flashbar items={notifications} />

      <Alert type="info" header="Mapping file required">
        You need the mapping file that was created during the masking process to unmask data.
      </Alert>

      <Container>
        <SpaceBetween size="m">
          <FormField label="Mapping file" description="Load the JSON mapping file from the masking process">
            <SpaceBetween direction="horizontal" size="xs">
              <input
                ref={mappingInputRef}
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={handleMappingSelect}
              />
              <Button
                iconName="upload"
                onClick={() => mappingInputRef.current?.click()}
              >
                Load mapping file
              </Button>
              {mappingFile && (
                <Badge color="green">Mapping loaded ({Object.keys(mappingFile).length} items)</Badge>
              )}
            </SpaceBetween>
          </FormField>
        </SpaceBetween>
      </Container>

      <ColumnLayout columns={2}>
        <Container 
          header={
            <Header
              variant="h2"
              actions={
                <Button 
                  iconName="remove" 
                  onClick={handleClear}
                  disabled={!text}
                >
                  Clear
                </Button>
              }
            >
              Input (Masked)
            </Header>
          }
        >
          <SpaceBetween size="l">
            <FormField 
              description="Paste or load masked text"
              secondaryControl={
                fileName && (
                  <Badge color="blue">{fileName.name} ({fileName.size} KB)</Badge>
                )
              }
              constraintText={text && `${charCount.toLocaleString()} characters, ${lineCount} lines`}
            >
              <Textarea
                value={text}
                onChange={e => setText(e.detail.value)}
                rows={20}
                placeholder="Paste masked text here or load a file..."
              />
            </FormField>

            <SpaceBetween direction="horizontal" size="xs">
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.json,.csv,.yaml,.yml"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
              <Button
                iconName="upload"
                onClick={() => fileInputRef.current?.click()}
              >
                Load file
              </Button>
              <Button
                variant="primary"
                onClick={handleUnmask}
                loading={loading}
                disabled={!text.trim() || !mappingFile}
              >
                Unmask data
              </Button>
            </SpaceBetween>
          </SpaceBetween>
        </Container>

        <Container 
          header={
            <Header
              variant="h2"
              actions={
                result && (
                  <SpaceBetween direction="horizontal" size="xs">
                    <Button 
                      iconName="copy" 
                      onClick={handleCopy}
                    >
                      Copy
                    </Button>
                    <Button
                      iconName="download"
                      onClick={handleSave}
                    >
                      Save
                    </Button>
                  </SpaceBetween>
                )
              }
              info={result && <Badge color="green">{result.items_unmasked} items unmasked in {result.processing_time_ms.toFixed(1)}ms</Badge>}
            >
              Output (Original)
            </Header>
          }
        >
          <SpaceBetween size="l">
            <FormField description={result ? 'Original data restored' : 'Original data will appear here after unmasking'}>
              <Textarea
                value={result?.unmasked_text || ''}
                readOnly
                rows={20}
                placeholder="🔓 Original data will appear here after processing..."
              />
            </FormField>
          </SpaceBetween>
        </Container>
      </ColumnLayout>
    </SpaceBetween>
  );
}
