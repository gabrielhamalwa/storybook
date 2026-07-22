<?php

declare(strict_types=1);

namespace App\Twig\Components;

use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\UX\LiveComponent\Attribute\AsLiveComponent;
use Symfony\UX\LiveComponent\Attribute\LiveAction;
use Symfony\UX\LiveComponent\DefaultActionTrait;

#[AsLiveComponent('LiveFileUpload')]
final class LiveFileUpload
{
    use DefaultActionTrait;

    public string $uploadedFile = 'No file uploaded';

    #[LiveAction]
    public function upload(Request $request): void
    {
        $file = $request->files->get('my_file');
        if (!$file instanceof UploadedFile) {
            $this->uploadedFile = 'No file received';

            return;
        }

        $this->uploadedFile = sprintf('%s: %s', $file->getClientOriginalName(), $file->getContent());
    }
}
