import struct
import zlib
import math

def create_png(r, g, b, filename, size=81, icon_type='circle'):
    def set_pixel(x, y, val):
        if 0 <= x < size and 0 <= y < size:
            idx = y * (size + 1) + x + 1
            if val:
                pixels[idx] = bytes([r, g, b, 255])
            else:
                pixels[idx] = bytes([0, 0, 0, 0])
    
    pixels = [bytes([0, 0, 0, 0])] * ((size + 1) * size)
    
    for y in range(size):
        pixels[y * (size + 1)] = b'\x00'
    
    cx, cy = size // 2, size // 2
    
    if icon_type == 'home':
        for y in range(size):
            for x in range(size):
                in_house = False
                roof_y = cy - 15 - abs(x - cx) * 0.8
                if y > roof_y and y < cy + 20:
                    if x > cx - 22 and x < cx + 22:
                        if x < cx - 8 or x > cx + 8 or y > cy:
                            in_house = True
                set_pixel(x, y, in_house)
                
    elif icon_type == 'trends':
        points = [
            (cx - 20, cy + 15),
            (cx - 5, cy - 5),
            (cx + 5, cy + 5),
            (cx + 20, cy - 15)
        ]
        
        for px, py in points:
            for dy in range(-4, 5):
                for dx in range(-4, 5):
                    if dx*dx + dy*dy <= 16:
                        set_pixel(px + dx, py + dy, True)
        
        for i in range(len(points) - 1):
            x1, y1 = points[i]
            x2, y2 = points[i + 1]
            steps = max(abs(x2 - x1), abs(y2 - y1), 1)
            for s in range(steps + 1):
                t = s / steps
                px = int(x1 + (x2 - x1) * t)
                py = int(y1 + (y2 - y1) * t)
                for dy in range(-2, 3):
                    for dx in range(-2, 3):
                        if dx*dx + dy*dy <= 4:
                            set_pixel(px + dx, py + dy, True)
                
    elif icon_type == 'reference':
        for y in range(size):
            for x in range(size):
                in_icon = False
                if 25 < x < size - 25 and 15 < y < size - 15:
                    if x < 30 or x > size - 30:
                        in_icon = True
                    if (y - 20) % 12 < 2 and 30 < x < size - 30:
                        in_icon = True
                set_pixel(x, y, in_icon)
                
    elif icon_type == 'reminder':
        for y in range(size):
            for x in range(size):
                dist = math.sqrt((x - cx) ** 2 + (y - cy + 6) ** 2)
                in_bell = False
                if 8 < dist < 18:
                    if y < cy + 7:
                        in_bell = True
                if dist < 6 and y > cy + 8:
                    in_bell = True
                if abs(x - cx) < 3 and cy - 19 < y < cy - 12:
                    in_bell = True
                set_pixel(x, y, in_bell)
    
    raw_data = b''.join(pixels)
    compressed = zlib.compress(raw_data, 9)
    
    def chunk(chunk_type, data):
        chunk_len = struct.pack('>I', len(data))
        chunk_crc = struct.pack('>I', zlib.crc32(chunk_type + data) & 0xffffffff)
        return chunk_len + chunk_type + data + chunk_crc
    
    png = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0))
    png += chunk(b'IDAT', compressed)
    png += chunk(b'IEND', b'')
    
    with open(filename, 'wb') as f:
        f.write(png)

# 灰色图标 (未选中)
create_png(153, 153, 153, 'tab-home.png', icon_type='home')
create_png(153, 153, 153, 'tab-trends.png', icon_type='trends')
create_png(153, 153, 153, 'tab-reference.png', icon_type='reference')
create_png(153, 153, 153, 'tab-reminder.png', icon_type='reminder')

# 青色图标(选中)
create_png(20, 184, 166, 'tab-home-active.png', icon_type='home')
create_png(20, 184, 166, 'tab-trends-active.png', icon_type='trends')
create_png(20, 184, 166, 'tab-reference-active.png', icon_type='reference')
create_png(20, 184, 166, 'tab-reminder-active.png', icon_type='reminder')

print('Done!')
