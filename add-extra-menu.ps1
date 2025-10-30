# PowerShell script to add more unique menu items for testing

$menuItems = @(
    @{ name = "Spicy Tuna Roll"; price = 13.49; category = "sushi"; available = $true; description = "Fresh tuna with spicy mayo and cucumber, rolled in rice and seaweed." },
    @{ name = "Classic Margherita Pizza"; price = 16.99; category = "pizza"; available = $true; description = "Wood-fired pizza with tomato sauce, mozzarella, and fresh basil." },
    @{ name = "Lamb Rogan Josh"; price = 19.99; category = "mains"; available = $true; description = "Tender lamb cooked in aromatic Indian spices and tomato gravy." },
    @{ name = "Vegan Buddha Bowl"; price = 14.99; category = "healthy"; available = $true; description = "Quinoa, chickpeas, roasted veggies, and tahini dressing." },
    @{ name = "Truffle Parmesan Fries"; price = 8.99; category = "appetizers"; available = $true; description = "Crispy fries tossed with truffle oil and parmesan cheese." },
    @{ name = "Thai Green Curry"; price = 17.99; category = "mains"; available = $true; description = "Chicken and vegetables simmered in coconut green curry sauce." },
    @{ name = "Molten Chocolate Brownie"; price = 7.99; category = "desserts"; available = $true; description = "Warm brownie with gooey chocolate center and vanilla ice cream." },
    @{ name = "Iced Matcha Latte"; price = 5.49; category = "beverages"; available = $true; description = "Chilled matcha green tea with milk and ice." }
)

foreach ($item in $menuItems) {
    $json = $item | ConvertTo-Json
    Invoke-RestMethod -Uri "http://localhost:5000/api/menu-items" -Method Post -ContentType "application/json" -Body $json
}
Write-Host "Extra menu items added!"
