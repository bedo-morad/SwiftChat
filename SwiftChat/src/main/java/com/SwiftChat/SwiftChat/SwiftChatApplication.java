package com.SwiftChat.SwiftChat;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing
public class SwiftChatApplication {

	public static void main(String[] args) {
		SpringApplication.run(SwiftChatApplication.class, args);
	}

}
