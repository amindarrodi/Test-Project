<?php
// Serve the same interface in PHP mode; GitHub Pages serves index.html directly.
echo str_replace('data-preview="true"', 'data-preview="false"', file_get_contents(__DIR__ . '/index.html'));
