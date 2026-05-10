package com.mealflow.appapi.recipes.extraction.web;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

final class MultipartHelper {

    private MultipartHelper() {}

    static final String BOUNDARY = "----mealflow-test-boundary";

    static byte[] singleFilePart(String fieldName, String filename, String contentType, byte[] data)
            throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        String header = "--" + BOUNDARY + "\r\n"
                + "Content-Disposition: form-data; name=\"" + fieldName + "\"; filename=\"" + filename + "\"\r\n"
                + "Content-Type: " + contentType + "\r\n\r\n";
        out.write(header.getBytes(StandardCharsets.UTF_8));
        out.write(data);
        out.write(("\r\n--" + BOUNDARY + "--\r\n").getBytes(StandardCharsets.UTF_8));
        return out.toByteArray();
    }

    /** Smallest valid JPEG body: SOI, APP0/JFIF marker, EOI. Passes magic-byte sniffing. */
    static byte[] minimalJpeg() {
        return new byte[] {
            (byte) 0xFF,
            (byte) 0xD8, // SOI
            (byte) 0xFF,
            (byte) 0xE0, // APP0
            0x00,
            0x10,
            'J',
            'F',
            'I',
            'F',
            0x00,
            0x01,
            0x01,
            0x00,
            0x00,
            0x01,
            0x00,
            0x01,
            0x00,
            0x00,
            (byte) 0xFF,
            (byte) 0xD9 // EOI
        };
    }
}
