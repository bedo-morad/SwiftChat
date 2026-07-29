package com.SwiftChat.SwiftChat.file;

import io.micrometer.common.util.StringUtils;
import lombok.extern.slf4j.Slf4j;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

@Slf4j
public class FileUtils {

    private FileUtils() {}

    public static byte[] readFileFromLocation(String filePath) {
        if (StringUtils.isEmpty(filePath)) {
            return new byte[0];
        }
        try {
            Path path = new File(filePath).toPath();
            return Files.readAllBytes(path);
        } catch (IOException e) {
            log.error("Could not read the file from the location {}", filePath, e);
        }
        return new byte[0];
    }
}
