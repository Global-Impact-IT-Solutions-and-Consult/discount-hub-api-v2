// Example Chatbot Responses

/**
 * Example 1: User asks for "cheap LG fridges"
 */

// USER MESSAGE:
{
  "content": "I need cheap LG fridges"
}

// AI RESPONSE (markdown formatted):
{
  "content": `I found some great affordable LG refrigerators for you! Here are the best deals:

### 🛒 LG 198L Direct Cool Refrigerator

![LG 198L Refrigerator](https://example.com/lg-198l.jpg)

**Price:** ~~$899.99~~ **$699.99** 🔥 (22% OFF)

⭐ **Rating:** 4.5 (150 reviews)

**Brand:** LG

**Categories:** Refrigerators, Home Appliances

**Store:** BestBuy

**Description:**
This energy-efficient LG refrigerator features Smart Inverter Compressor technology for optimal cooling with minimal energy consumption. Perfect for small to medium families...

**Key Features:**
• Smart Inverter Compressor
• Multi Air Flow cooling
• Toughened glass shelves
• Moist balance crisper...

[🔗 View Product](https://store.com/lg-198l)

---

### 🛒 LG 260L Frost Free Refrigerator

![LG 260L Refrigerator](https://example.com/lg-260l.jpg)

**Price:** ~~$1,199.99~~ **$849.99** 🔥 (29% OFF)

⭐ **Rating:** 4.7 (230 reviews)

**Brand:** LG

**Categories:** Refrigerators, Home Appliances

**Store:** Amazon

**Description:**
Spacious LG refrigerator with advanced frost-free technology. Features door cooling+ for 35% faster cooling and maintaining even temperature throughout...

**Key Features:**
• Door Cooling+ Technology
• Smart Diagnosis
• Stabilizer-free operation
• Energy Star certified...

[🔗 View Product](https://store.com/lg-260l)

---

### 🛒 LG 335L Double Door Refrigerator

![LG 335L Refrigerator](https://example.com/lg-335l.jpg)

**Price:** ~~$1,499.99~~ **$999.99** 🔥 (33% OFF)

⭐ **Rating:** 4.6 (189 reviews)

**Brand:** LG

**Categories:** Refrigerators, Home Appliances

**Store:** Target

**Description:**
Premium LG double door refrigerator with convertible freezer. The Smart Connect feature allows you to run the refrigerator on home inverter during power cuts...

**Key Features:**
• Convertible freezer
• Smart Connect inverter
• Hygiene Fresh+
• LED lighting...

[🔗 View Product](https://store.com/lg-335l)

---

These are the most affordable LG refrigerators currently available, sorted by price. All three have excellent ratings and significant discounts! Would you like more details about any specific model?`,
  "type": "AI",
  "metaData": {
    "tool_calls": 4,
    "execution_time": "2.3s"
  }
}

/**
 * Example 2: User asks for "Samsung TVs under $500"
 */

// USER MESSAGE:
{
  "content": "Show me Samsung TVs under $500"
}

// AI RESPONSE:
{
  "content": `Here are the best Samsung TVs available under $500:

### 🛒 Samsung 32" HD Smart TV

![Samsung 32 inch TV](https://example.com/samsung-32.jpg)

**Price:** **$279.99**

⭐ **Rating:** 4.3 (345 reviews)

**Brand:** Samsung

**Categories:** Televisions, Electronics, Smart TV

**Store:** Walmart

**Description:**
Experience stunning picture quality with this Samsung HD Smart TV. Built-in WiFi and streaming apps make it easy to access your favorite content...

**Key Features:**
• HD Ready 1366 x 768
• Built-in WiFi
• HDR support
• 2 HDMI ports...

[🔗 View Product](https://store.com/samsung-32)

---

### 🛒 Samsung 43" Full HD Smart TV

![Samsung 43 inch TV](https://example.com/samsung-43.jpg)

**Price:** ~~$549.99~~ **$449.99** 🔥 (18% OFF)

⭐ **Rating:** 4.6 (567 reviews)

**Brand:** Samsung

**Categories:** Televisions, Electronics, Smart TV

**Store:** BestBuy

**Description:**
Immersive Full HD viewing experience with Samsung's advanced picture engine. Smart hub provides easy access to streaming services, gaming, and more...

**Key Features:**
• Full HD 1920 x 1080
• Smart TV with Tizen OS
• Voice control compatible
• 3 HDMI, 2 USB ports...

[🔗 View Product](https://store.com/samsung-43)

---

All these Samsung TVs fit within your $500 budget and come with smart features. The 43" model is currently on sale with a great discount! Would you like to know more about any of these?`,
  "type": "AI"
}

/**
 * Example 3: Follow-up question in conversation
 */

// Previous context: User asked about LG fridges, AI showed results

// USER MESSAGE:
{
  "content": "What about the smallest one?"
}

// AI RESPONSE (with context):
{
  "content": `Based on our previous discussion about LG refrigerators, the smallest option I showed you was:

### 🛒 LG 198L Direct Cool Refrigerator

![LG 198L Refrigerator](https://example.com/lg-198l.jpg)

**Price:** ~~$899.99~~ **$699.99** 🔥 (22% OFF)

⭐ **Rating:** 4.5 (150 reviews)

**Brand:** LG

**Categories:** Refrigerators, Home Appliances

**Store:** BestBuy

**Description:**
This energy-efficient LG refrigerator features Smart Inverter Compressor technology for optimal cooling with minimal energy consumption. Perfect for small to medium families...

**Key Features:**
• Smart Inverter Compressor
• Multi Air Flow cooling
• Toughened glass shelves
• Moist balance crisper
• Annual power consumption: 150 kWh

[🔗 View Product](https://store.com/lg-198l)

---

This 198-liter model is perfect for couples or small families. Despite being the smallest, it still has excellent features and the best discount at 22% off! Would you like to see other compact refrigerators from different brands?`,
  "type": "AI"
}

/**
 * Example 4: Generic product search
 */

// USER MESSAGE:
{
  "content": "I'm looking for headphones"
}

// AI RESPONSE:
{
  "content": `I found several great headphone options for you:

### 🛒 Sony WH-1000XM5 Wireless Headphones

![Sony WH-1000XM5](https://example.com/sony-xm5.jpg)

**Price:** ~~$399.99~~ **$349.99** 🔥 (13% OFF)

⭐ **Rating:** 4.8 (1234 reviews)

**Brand:** Sony

**Categories:** Headphones, Audio, Electronics

**Store:** Amazon

**Description:**
Industry-leading noise cancellation with two processors controlling 8 microphones. Up to 30-hour battery life with quick charging...

**Key Features:**
• Premium noise cancellation
• 30-hour battery life
• Multi-point connection
• Touch controls...

[🔗 View Product](https://store.com/sony-xm5)

---

### 🛒 Bose QuietComfort 45 Headphones

![Bose QC45](https://example.com/bose-qc45.jpg)

**Price:** ~~$329.99~~ **$279.99** 🔥 (15% OFF)

⭐ **Rating:** 4.7 (892 reviews)

**Brand:** Bose

**Categories:** Headphones, Audio, Electronics

**Store:** BestBuy

**Description:**
Legendary Bose noise cancellation meets all-day comfort. Perfect for travel, work, or relaxation with adjustable EQ...

[🔗 View Product](https://store.com/bose-qc45)

---

Would you prefer wireless or wired headphones? Do you have a specific budget in mind? I can help narrow down the options!`,
  "type": "AI"
}

/**
 * Example 5: No results found
 */

// USER MESSAGE:
{
  "content": "Do you have flying cars?"
}

// AI RESPONSE:
{
  "content": `I'm sorry, but I couldn't find any flying cars in our product database. This category doesn't seem to exist in our current inventory.

However, I can help you find:
- Electric vehicles
- RC drones and flying toys
- Car accessories and electronics
- Automotive gadgets

Would you like me to show you any of these alternatives?`,
  "type": "AI"
}

/**
 * Example 6: Price comparison request
 */

// USER MESSAGE:
{
  "content": "Compare laptops under $800"
}

// AI RESPONSE:
{
  "content": `Here are the best laptops under $800, sorted by value:

### 🛒 Dell Inspiron 15 3000

![Dell Inspiron](https://example.com/dell-inspiron.jpg)

**Price:** **$599.99**

⭐ **Rating:** 4.4 (456 reviews)

**Brand:** Dell

**Categories:** Laptops, Computers, Electronics

**Store:** Dell Official

**Description:**
Reliable performance for everyday computing. Intel Core i5 processor, 8GB RAM, and 256GB SSD make this perfect for work and study...

**Key Features:**
• Intel Core i5-1135G7
• 8GB DDR4 RAM
• 256GB SSD
• 15.6" FHD display...

[🔗 View Product](https://store.com/dell-inspiron)

---

### 🛒 HP Pavilion 14

![HP Pavilion](https://example.com/hp-pavilion.jpg)

**Price:** ~~$899.99~~ **$749.99** 🔥 (17% OFF)

⭐ **Rating:** 4.6 (689 reviews)

**Brand:** HP

**Categories:** Laptops, Computers, Electronics

**Store:** BestBuy

**Description:**
Powerful and portable with AMD Ryzen 5 processor. Great for multitasking with 16GB RAM and fast 512GB SSD storage...

**Key Features:**
• AMD Ryzen 5 5500U
• 16GB DDR4 RAM
• 512GB SSD
• 14" FHD IPS display...

[🔗 View Product](https://store.com/hp-pavilion)

---

### 🛒 Lenovo IdeaPad 3

![Lenovo IdeaPad](https://example.com/lenovo-ideapad.jpg)

**Price:** **$549.99**

⭐ **Rating:** 4.3 (334 reviews)

**Brand:** Lenovo

**Categories:** Laptops, Computers, Electronics

**Store:** Amazon

**Description:**
Budget-friendly laptop with solid performance. Great for students and basic productivity tasks...

[🔗 View Product](https://store.com/lenovo-ideapad)

---

**Comparison Summary:**
- **Best Value:** Dell Inspiron ($599) - balanced specs at mid-range price
- **Most Powerful:** HP Pavilion ($749) - 16GB RAM, bigger SSD, on sale!
- **Most Affordable:** Lenovo IdeaPad ($549) - great for basic needs

Which features matter most to you - performance, portability, or price?`,
  "type": "AI"
}
