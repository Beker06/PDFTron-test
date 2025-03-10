import React, { useEffect, useRef, useState } from 'react';
import { 
    Accordion, 
    AccordionDetails, 
    AccordionSummary, 
    Box, 
    Button, 
    Container, 
    IconButton, 
    Paper, 
    Table, 
    TableBody, 
    TableCell, 
    TableContainer, 
    TableHead, 
    TableRow, 
    Typography 
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import WebViewer from '@pdftron/webviewer';

interface SplitFile {
    name: string;
    size: number;
    url: string;
}

const DigitalizadorPro = () => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [splitFiles, setSplitFiles] = useState<SplitFile[]>([]);
    const viewerRef = useRef<HTMLDivElement | null>(null);
    const [instance, setInstance] = useState<any>()
    const MAX_CHUNK_SIZE = 2.7 * 1024 * 1024;

    useEffect(() => {
        const initWebViewer = async () => {
            if (viewerRef.current) {
                const instancia = await WebViewer({
                    path: '/webviewer/lib',
                    fullAPI: true,
                }, viewerRef.current);
                setInstance(instancia)
                console.log("WebViewer inicializado");
            }
        };
        initWebViewer();
    }, []);

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const splitPDF = async (file: File) => {
        try {
            console.log("Entro")
            if (!instance || !instance.Core) {
                alert('WebViewer no está inicializado. Por favor, espera unos segundos e intenta de nuevo.');
                return;
            }

            const Core = instance.Core
            console.log("Core Asignado")

            const originalArrayBuffer = await file.arrayBuffer();
        
        // Crear una copia del buffer para poder usarlo múltiples veces
            const bufferCopy = new ArrayBuffer(originalArrayBuffer.byteLength);
            new Uint8Array(bufferCopy).set(new Uint8Array(originalArrayBuffer));

            const pdfDoc = await Core.createDocument(bufferCopy, { extension: 'pdf' });
            console.log('si')
            const pageCount = pdfDoc.getPageCount();
            const newSplitFiles: SplitFile[] = [];

            const avgPageSize = file.size / pageCount;
            const pagesPerChunk = Math.floor(MAX_CHUNK_SIZE / avgPageSize);
            const totalChunks = Math.ceil(pageCount / pagesPerChunk);

            console.log("Archivo pdftron", pdfDoc);
            console.log(`
                Tamaño de PDF: ${formatFileSize(file.size)}
                Paginas totales de pdf: ${pageCount}
                Average Page Size: ${formatFileSize(avgPageSize)}
                Maximo Tamaño de Chunk(2.7): ${formatFileSize(MAX_CHUNK_SIZE)} 
                Paginas por chunk: ${pagesPerChunk}
                Chunks Totales: ${totalChunks}
            `)

            for (let i = 0; i < totalChunks; i++) {
                const startPage = i * pagesPerChunk + 1;
                const endPage = Math.min((i + 1) * pagesPerChunk, pageCount);
                console.log(`Procesando páginas ${startPage}-${endPage}`);
                
                try {
                    // Creamos un nuevo documento a partir del archivo original para cada chunk
                    // (Leer el archivo como arrayBuffer de nuevo)
                    const newBufferCopy = new ArrayBuffer(originalArrayBuffer.byteLength);
                    new Uint8Array(newBufferCopy).set(new Uint8Array(originalArrayBuffer));
                    
                    const newDoc = await Core.createDocument(newBufferCopy, { extension: 'pdf' });
                    
                    // Eliminar las páginas que no queremos mantener
                    const pagesToRemove = [];
                    for (let j = 1; j <= pageCount; j++) {
                        if (j < startPage || j > endPage) {
                            pagesToRemove.push(j);
                        }
                    }
                    
                    // Eliminar páginas en orden descendente para evitar problemas con los índices
                    pagesToRemove.sort((a, b) => b - a);
                    await newDoc.removePages(pagesToRemove);
                    
                    const data = await newDoc.getFileData();
                    const arr = new Uint8Array(data);
                    const blob = new Blob([arr], { type: 'application/pdf' });
                    const url = URL.createObjectURL(blob);

                    newSplitFiles.push({
                        name: `${file.name.split('.')[0]}_part${i + 1}.pdf`,
                        size: blob.size,
                        url: url,
                    });
                } catch (removeError) {
                    console.error('Error removing pages:', removeError);
                }
            }
    
            setSplitFiles(newSplitFiles);
        } catch (error) {
            console.error('Error splitting PDF with PDFTron:', error);
            alert('Error splitting PDF. Please try again.');
        }
    }

    const splitFile = async (file: File) => {
        if (file.type === 'application/pdf') {
            await splitPDF(file);
        } else {
            alert('Por favor sube un archivo PDF válido.');
            return;
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setSplitFiles([]);
        }
    };

    const handleSplit = () => {
        if (selectedFile) {
            splitFile(selectedFile);
        }
    };

    const downloadSplitFile = (splitFile: SplitFile) => {
        const link = document.createElement('a');
        link.href = splitFile.url;
        link.download = splitFile.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const downloadAllFiles = () => {
        splitFiles.forEach(file => downloadSplitFile(file));
    };

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
    };

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();

        const file = event.dataTransfer.files?.[0];
        if (file) {
            setSelectedFile(file);
            setSplitFiles([]);
        }
    };

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            {/* File Input Section */}
            <div ref={viewerRef} style={{ display: 'none' }}></div>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
                <Paper
                    variant="outlined"
                    sx={{
                        width: '100%',
                        maxWidth: 600,
                        height: 200,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        border: '2px dashed',
                        borderColor: 'primary.main',
                        borderRadius: 2,
                        bgcolor: 'background.paper',
                        '&:hover': {
                            borderColor: 'primary.dark',
                            bgcolor: 'action.hover',
                        },
                    }}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                >
                    <input
                        type="file"
                        hidden
                        onChange={handleFileChange}
                        accept=".pdf,.jpg,.jpeg,.png"
                    />
                    <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                    <Typography variant="h6" color="primary" gutterBottom>
                        Drag and drop your file here
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        or click to select a file
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Supported formats: PDF, JPG, PNG
                    </Typography>
                </Paper>

                {selectedFile && (
                    <Button
                        variant="contained"
                        onClick={handleSplit}
                        sx={{ mt: 2 }}
                    >
                        SPLIT FILE
                    </Button>
                )}
            </Box>

            {/* Single Accordion for Original + Split Files */}
            {selectedFile && (
                <Accordion defaultExpanded>
                    <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        aria-controls="file-content"
                        id="file-header"
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <InsertDriveFileIcon sx={{ mr: 1 }} />
                                <Box>
                                    <Typography variant="subtitle1">{selectedFile.name}</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Original File • {formatFileSize(selectedFile.size)}
                                    </Typography>
                                </Box>
                            </Box>
                            {splitFiles.length > 0 && (
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        downloadAllFiles();
                                    }}
                                    sx={{ mr: 2 }}
                                >
                                    Download all
                                </Button>
                            )}
                        </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                        {splitFiles.length > 0 ? (
                            <TableContainer>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Nombre</TableCell>
                                            <TableCell>Tamaño</TableCell>
                                            <TableCell>E-Document</TableCell>
                                            <TableCell align="right">Acción</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {splitFiles.map((file, index) => (
                                            <TableRow key={index}>
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                        <InsertDriveFileIcon sx={{ mr: 1 }} />
                                                        {file.name}
                                                    </Box>
                                                </TableCell>
                                                <TableCell>{formatFileSize(file.size)}</TableCell>
                                                <TableCell>No</TableCell>
                                                <TableCell align="right">
                                                    <IconButton
                                                        onClick={() => downloadSplitFile(file)}
                                                        title="Descargar"
                                                    >
                                                        <DownloadIcon />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        ) : (
                            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                                Click "SPLIT FILE" to generate split files
                            </Typography>
                        )}
                    </AccordionDetails>
                </Accordion>
            )}
        </Container>
    );
}

export default DigitalizadorPro